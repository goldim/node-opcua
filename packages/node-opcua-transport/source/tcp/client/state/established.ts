import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"

import * as chalk from "chalk";
import { Handshake } from "../../../core/handshake/handshake";
import { State } from "./base";
import { IContext } from "../client";

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
        assert(this._context.getSocket());
        if (doDebug) {
            debugLog("_install_socket ", this._context.name);
        }

        this._context.init();
        
        this._context.getSocket()
            .on("data", this._onSocketData.bind(this))
            .on("close", this._onSocketClose.bind(this))
            .on("end", this._onSocketEnd.bind(this))
            .on("error", this._onSocketError.bind(this));
               

        this._handshake = Handshake.Factory.getHandshake(this._context.isPassive(), this._context);
        this._handshake.protocolVersion = this._context.protocolVersion;
        
        this._handshake.start((err?: Error) => {
            if (!err) { 
                this._context.sendBufferSize = this._handshake.sendBufferSize;
                this._onSuccessHandshake();
            } else {
                this._onFailHandshake(err);
            }
            this._context.callErrorCb(err!);
        }, this._context.getTimer(), this._context.getEndpointUrl());
    }

    protected _onSuccessHandshake(): void 
    {   
        console.info("handshadke done");
        // install error handler to detect connection break
        this._context.getSocket().removeAllListeners("end");
        this._context.getSocket().removeAllListeners("close");
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

    private _onSocketData(data: Buffer): void {
        this._context.deserialize(data, data.length);
    }

    private _onSocketEnd(err: Error) {
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET END : "), err ? chalk.yellow(err.message) : "null", this._context.name);
        }
        this._onSocketEndedMsg(err);
    }

    private _onSocketClosed(err?: Error) {
        /**
         * notify the observers that the transport layer has been disconnected.
         * @event socket_closed
         * @param err the Error object or null
         */
        this.changeState("closed");
        this._context.emit("close", err || null);
    }   

    private _onSocketClose(hadError: boolean) {
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET CLOSE : "),
                chalk.yellow("had_error ="), chalk.cyan(hadError.toString()), this._context.name);
        }
        if (this._context.getSocket()) {
            debugLog("  remote address = ",
                this._context.getSocket().remoteAddress, " ", this._context.getSocket().remoteFamily,
                 " ", this._context.getSocket().remotePort);
        }
        if (hadError) {
            this._context.getSocket().destroy();
        }
        const err = hadError ? new Error("ERROR IN SOCKET") : undefined;
        this._onSocketClosed(err);
    }

    private _onSocketEndedMsg(err?: Error) {
        debugLog(chalk.red("Transport Connection ended") + " " + this._context.name);
        err = err || new Error("_socket has been disconnected by third party");

        this._onSocketEnded(err);

        // debugLog(" bytesRead    = ", this._transport.bytesRead);
        // debugLog(" bytesWritten = ", this._transport.bytesWritten);
        this._context.getTimer().cancel(new Error("Connection aborted - ended by server : " + (err ? err.message : "")));
    }

    private _onSocketError(err: Error) {
        // istanbul ignore next
        if (doDebug) {
            debugLog(chalk.red(" SOCKET ERROR : "), chalk.yellow(err.message), this._context.name);
        }
        // node The "close" event will be called directly following this event.
    }

    public disconnect(callback: ErrorCallback): void {
        assert(_.isFunction(callback), "expecting a callback function, but got " + callback);

        // xx assert(!this._theCallback,
        //              "disconnect shall not be called while the 'one time message receiver' is in operation");
        this._context.getTimer().reset();
        this._context.closeSocket();
        
        setImmediate(() => {
            this._onSocketEnded(null);
            callback();
        });
    }

    protected _onSocketEnded(err: Error | null) {        
        this.changeState("closed");
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