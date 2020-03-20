import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as chalk from "chalk";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../itransport"
import { BinaryStream } from "node-opcua-binary-stream";
import { readMessageHeader } from "node-opcua-chunkmanager";
import { packTcpMessage, decodeMessage } from "../tools";
import { AcknowledgeMessage } from "../AcknowledgeMessage";
import { HelloMessage } from "../HelloMessage";
import { TCPErrorMessage } from "../TCPErrorMessage";
import { verify_message_chunk } from "node-opcua-chunkmanager";
import { StatusCode, StatusCodes } from "node-opcua-status-code";
import { IOperationTimer } from "../OpTimer";
import { ISerializer } from "../transport_base"

const hexDump = debug.hexDump;
const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

function clamp_value(value: number, minVal: number, maxVal: number): number {
    assert(minVal < maxVal);
    if (value === 0) {
        return maxVal;
    }
    if (value < minVal) {
        return minVal;
    }
    /* istanbul ignore next*/
    if (value >= maxVal) {
        return maxVal;
    }
    return value;
}

const minimumBufferSize = 8192;

export interface IHandshake
{
    protocolVersion: number;
    sendBufferSize: number;
    receiveBufferSize: number;

    start(cb: ErrorCallback, timer: IOperationTimer, url: string): void;
}

export class Handshake
{
    protected _counter: number;
    protected _serializer: ISerializer;
    private _helloReceived: boolean;
    public protocolVersion: number;
    private _aborted: number;
    protected _url: string;

    public receiveBufferSize: number;
    public sendBufferSize: number;
    public maxMessageSize: number;
    public maxChunkCount: number;

    constructor(serializer: ISerializer){
        this._counter = 0;
        this._serializer = serializer;
        this._helloReceived = false;
        this.protocolVersion = 0;
        this._aborted = 0;
        this._url = "";

        this.receiveBufferSize = 0;
        this.sendBufferSize = 0;
        this.maxMessageSize = 0;
        this.maxChunkCount = 0;
    }

    protected onResponseACK(externalCallback: ErrorCallback, err: Error | null, data?: Buffer) {
        if (doDebug) {
            debugLog("ACK response started");
        }

        assert(_.isFunction(externalCallback));
        assert(this._counter === 0, "Ack response should only be received once !");
        this._counter += 1;

        if (err) {
            externalCallback(err);
        } else {
            if (!data) {
                return;
            }
            this.handleResponceACK(data, externalCallback);
        }
    }

    public onResponseHello(data: Buffer, callback: ErrorCallback){
        if (debugLog) {
            debugLog(chalk.cyan("_on_HEL_message"));
        }

        assert(data instanceof Buffer);
        assert(!this._helloReceived);
        const stream = new BinaryStream(data);
        const msgType = data.slice(0, 3).toString("ascii");

        /* istanbul ignore next*/
        if (doDebug) {
            debugLog("SERVER received " + chalk.yellow(msgType));
            debugLog("SERVER received " + hexDump(data));
        }

        if (msgType === "HEL") {

            assert(data.length >= 24);

            const helloMessage = decodeMessage(stream, HelloMessage) as HelloMessage;
            // assert(_.isFinite(this.protocolVersion));

            // OPCUA Spec 1.03 part 6 - page 41
            // The Server shall always accept versions greater than what it supports.
            if (helloMessage.protocolVersion !== this.protocolVersion) {
                debugLog(`warning ! client sent helloMessage.protocolVersion = ` +
                  ` 0x${helloMessage.protocolVersion.toString(16)} ` +
                  `whereas server protocolVersion is 0x${this.protocolVersion.toString(16)}`);
            }

            if (helloMessage.protocolVersion === 0xDEADBEEF || helloMessage.protocolVersion < this.protocolVersion) {

                // Note: 0xDEADBEEF is our special version number to simulate BadProtocolVersionUnsupported in tests
                // invalid protocol version requested by client
                return this._abortWithError(StatusCodes.BadProtocolVersionUnsupported,
                  "Protocol Version Error" + this.protocolVersion, callback);

            }

            // OPCUA Spec 1.04 part 6 - page 45
            // UASC is designed to operate with different TransportProtocols that may have limited buffer
            // sizes. For this reason, OPC UA Secure Conversation will break OPC UA Messages into several
            // pieces (called ‘MessageChunks’) that are smaller than the buffer size allowed by the
            // TransportProtocol. UASC requires a TransportProtocol buffer size that is at least 8 192 bytes
            if (helloMessage.receiveBufferSize < minimumBufferSize || helloMessage.sendBufferSize < minimumBufferSize) {
                return this._abortWithError(StatusCodes.BadConnectionRejected,
                  "Buffer size too small (should be at least " + minimumBufferSize, callback);
            }
            // the helloMessage shall only be received once.
            this._helloReceived = true;
            this.requestResponseACK(helloMessage);
            callback(); // no Error

        } else {

            // invalid packet , expecting HEL
            /* istanbul ignore next*/
            if (doDebug) {
                debugLog(chalk.red("BadCommunicationError ") + "Expecting 'HEL' message to initiate communication");
            }
            this._abortWithError(
              StatusCodes.BadCommunicationError,
              "Expecting 'HEL' message to initiate communication", callback);

        }
    }

    public requestResponseACK(helloMessage: HelloMessage){
        assert(helloMessage.receiveBufferSize >= minimumBufferSize);
        assert(helloMessage.sendBufferSize >= minimumBufferSize);

        this.receiveBufferSize = clamp_value(helloMessage.receiveBufferSize, 8192, 512 * 1024);
        this.sendBufferSize = clamp_value(helloMessage.sendBufferSize, 8192, 512 * 1024);
        this.maxMessageSize = clamp_value(helloMessage.maxMessageSize, 100000, 16 * 1024 * 1024);
        this.maxChunkCount = clamp_value(helloMessage.maxChunkCount, 0, 65535);

        const acknowledgeMessage = new AcknowledgeMessage({
            maxChunkCount: this.maxChunkCount,
            maxMessageSize: this.maxMessageSize,
            protocolVersion: this.protocolVersion,
            receiveBufferSize: this.receiveBufferSize,
            sendBufferSize: this.sendBufferSize
        });
        const messageChunk = packTcpMessage("ACK", acknowledgeMessage);

        /* istanbul ignore next*/
        if (doDebug) {
            verify_message_chunk(messageChunk);
            debugLog("server send: " + chalk.yellow("ACK"));
            debugLog("server send: " + hexDump(messageChunk));
            debugLog("acknowledgeMessage=", acknowledgeMessage);
        }

        // send the ACK reply
        this._serializer.serialize(messageChunk);
    }

    private _abortWithError(statusCode: StatusCode, extraErrorDescription: string, callback: ErrorCallback) {

        if (debugLog) {
            debugLog(chalk.cyan("_abortWithError"));
        }

        assert(_.isFunction(callback), "expecting a callback");

        /* istanbul ignore else */
        if (!this._aborted) {
            this._aborted = 1;
            // send the error message and close the connection
            assert(StatusCodes.hasOwnProperty(statusCode.name));

            /* istanbul ignore next*/
            if (doDebug) {
                debugLog(chalk.red(" Server aborting because ") + chalk.cyan(statusCode.name));
                debugLog(chalk.red(" extraErrorDescription   ") + chalk.cyan(extraErrorDescription));
            }

            const errorResponse = new TCPErrorMessage({
                reason: statusCode.description
                , statusCode
            });

            const messageChunk = packTcpMessage("ERR", errorResponse);

            this._serializer.serialize(messageChunk);
            // this._transport.disconnect(() => {
            //     this._aborted = 2;
            //     callback(new Error(extraErrorDescription + " StatusCode = " + statusCode.name));
            // });

        } else {
            callback(new Error(statusCode.name));
        }
    }  

    protected requestHELLO() { 
        console.info("request");
        if (doDebug) {
            debugLog("request hello");
        }
        
        assert(_.isFinite(this.protocolVersion));

        // Write a message to the socket as soon as the client is connected,
        // the server will receive it as message from the client
        const request = new HelloMessage({

            endpointUrl: this._url,
            maxChunkCount: 0,                 // 0 - no limits
            maxMessageSize: 0,                // 0 - no limits

            protocolVersion: this.protocolVersion,
            receiveBufferSize: 1024 * 64 * 10,
            sendBufferSize: 1024 * 64 * 10   // 8192 min,
        });

        const messageChunk = packTcpMessage("HEL", request);
        this._serializer.serialize(messageChunk);
    }

    private handleResponceACK(messageChunk: Buffer, callback: ErrorCallback) {
        const _stream = new BinaryStream(messageChunk);
        const messageHeader = readMessageHeader(_stream);
        let err;
        if (messageHeader.isFinal !== "F") {
            err = new Error(" invalid ACK message");
            return callback(err);
        }

        let responseClass;
        let response;

        if (messageHeader.msgType === "ERR") {
            responseClass = TCPErrorMessage;
            _stream.rewind();
            response = decodeMessage(_stream, responseClass) as TCPErrorMessage;

            err = new Error("ACK: ERR received " + response.statusCode.toString() + " : " + response.reason);
            (err as any).statusCode = response.statusCode;
            callback(err);
        } else {
            responseClass = AcknowledgeMessage;
            _stream.rewind();
            response = decodeMessage(_stream, responseClass);
            let parameters: any = response;
            if(parameters && parameters.sendBufferSize)
            {
                this.sendBufferSize = parameters.sendBufferSize;
                this.receiveBufferSize = parameters.receiveBufferSize;
            }
            
            callback();
        }
    }
}