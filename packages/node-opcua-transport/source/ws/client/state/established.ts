import * as WebSocket from "ws";
import * as chalk from "chalk";
import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"
import { IContext } from "../client"
import { State } from "./base";
import { Handshake } from "../../../core/handshake/handshake";

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class Established extends State
{
    private _handshake!: Handshake.IHandshake;

    constructor(ctx: IContext){
        super(ctx);
    }

    public onChange(): void
    {
        if (doDebug) {
            // debugLog("_install_socket ", this._transport.name);
        }
        
        this._context.init();
        this._context.getSocket().onmessage = (event: any) => this._onSocketData(event);
        this._context.getSocket().onclose = (event: WebSocket.CloseEvent) => this._onSocketClose(event);
        this._context.getSocket().onerror = (err: WebSocket.ErrorEvent) => this._onSocketError(err);

        this._handshake = Handshake.Factory.getHandshake(this._context.isPassive(), this._context);
        this._handshake.protocolVersion = this._context.protocolVersion;
        
        this._handshake.start((err?: Error) => {
            if (!err) {
                this._onSuccessHandshake();
            } else {
                this._onFailHandshake(err);
            }
            this._context.callErrorCb(err!);
        }, this._context.getTimer(), this._context.getEndpointUrl());
    }

    protected _onSocketData(data: any): void 
    {   
        let parent = this;

        function f(err:any, buffer:Buffer){
            parent._context.deserialize(buffer, buffer.length);
        };
        
        if (!(data.data instanceof Buffer))
        {
            var btb = require("blob-to-buffer");
            btb(data.data, f);
        }
        else
        {
            this._context.deserialize(data.data, data.data.length);
        }
    }

    protected _onSuccessHandshake(): void 
    {        
        console.info("handshadke done");
        // install error handler to detect connection break
        this.changeState("handshaked");
        /**
         * notify the observers that the transport is connected (the socket is connected and the the HEL/ACK
         * transaction has been done)
         * @event connect
         *
         */
        this._context.emitReady();
    }

    protected _onFailHandshake(err: Error): void 
    {        
        debugLog("handshake has failed with err=", err.message);
    }

    private _onSocketEnd(err: Error) {
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET END : "), err ? chalk.yellow(err.message) : "null", this._context.name);
        }
        this._onSocketEndedMsg(err);
    }

    private _onSocketClose(event: WebSocket.CloseEvent) {

        if (!event.wasClean)
        {
            var error = new Error();
            switch(event.code)
            {
                case 1006:
                    error.message = "ECONNRESET";
                    break;
                case 1002:
                    error.message = "BadProtocolVersionUnsupported";
                    break;
                default:
                    error.message = event.reason;
            }

            // EPIPE : EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no process to read the
            // data. Commonly encountered at the net and http layers, indicative that the remote side of the stream
            // being written to has been closed.

            // ECONNRESET (Connection reset by peer): A connection was forcibly closed by a peer. This normally results
            // from a loss of the connection on the remote socket due to a timeout or reboot. Commonly encountered
            // via the http and net module            
            if (error.message.match(/ECONNRESET|EPIPE/)) {
                console.info("!!!!!!!!!!!!!!!!!!!ECONNRESET");
                /**
                 * @event connection_break
                 *
                 */
				this.changeState("closed");
                this._context.emit("connection_break");
				return;
            }
        }

        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET CLOSE : "),
                chalk.yellow("had_error ="), chalk.cyan(event.reason), this._context.name);
        }
        
        debugLog("  remote address = ",
            this._context.getEndpointUrl());
                
        const err = !event.wasClean ? new Error("ERROR IN SOCKET") : undefined;
        this._onSocketClosed(err);
    }

    private _onSocketClosed(err?: Error) {
        console.info("closing...");
        if (err)
        {
            this._onSocketEnd(err);
        }
        
        this.changeState("closed");
        /**
         * notify the observers that the transport layer has been disconnected.
         * @event socket_closed
         * @param err the Error object or null
         */
        this._context.emit("close", err || null);
    }

    private _onSocketEndedMsg(err?: Error) {
        // debugLog(chalk.red("Transport Connection ended") + " " + this._transport.name);        
        err = err || new Error("_socket has been disconnected by third party");
        this._onSocketEnded(err);        

        // debugLog(" bytesRead    = ", this._transport.bytesRead);
        // debugLog(" bytesWritten = ", this._transport.bytesWritten);
        this._context.getTimer().cancel(new Error("Connection aborted - ended by server : " + (err ? err.message : "")));
    }

    private _onSocketError(err: WebSocket.ErrorEvent) {
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET ERROR : "), chalk.yellow(err.message), this._context.name);
        }
        // node The "close" event will be called directly following this event.
    }

    public disconnect(callback: ErrorCallback): void {
        assert(_.isFunction(callback), "expecting a callback function, but got " + callback);
        this._context.getTimer().reset();
        this._context.closeSocket();

        setImmediate(() => {
            this._onSocketEnded(null);
            callback();
        });
    }

    protected _onSocketEnded(err: Error | null) {
        this.changeState("closed");

        // assert(!this._onSocketEndedHasBeenCalled);
        // this._onSocketEndedHasBeenCalled = true; // we don't want to send close event twice ...
        /**
         * notify the observers that the transport layer has been disconnected.
         * @event close
         * @param err the Error object or null
         */
        this._context.emit("close", err || null);
    }

    public write(messageChunk: Buffer) {
        this._context.serialize(messageChunk);
    }
}