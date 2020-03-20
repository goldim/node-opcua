import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

import { IContext } from "../client"
import { State } from "./base";

export class Handshaked extends State
{
    constructor(ctx: IContext){
        super(ctx);
    }

    public onChange(): void
    {
        if (!this._context.getSocket()) {
            throw new Error("internal error");
        }
        // install error handler to detect connection break
        this._context.getSocket().on("error", this._onSocketErrorAfterHandshaked.bind(this));
        this._context.getSocket().on("end", this._onSocketEndAfterHandshaked.bind(this));
    }

    protected _onSocketErrorAfterHandshaked(event: Error): void
    {
        if (doDebug) {
            debugLog(" _on_socket_error_after_connection ClientTCP_transport Socket Error", event.message);
        }
        
        // EPIPE : EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no process to read the
        // data. Commonly encountered at the net and http layers, indicative that the remote side of the stream
        // being written to has been closed.

        // ECONNRESET (Connection reset by peer): A connection was forcibly closed by a peer. This normally results
        // from a loss of the connection on the remote socket due to a timeout or reboot. Commonly encountered
        // via the http and net module            
        if (event.message.match(/ECONNRESET|EPIPE/)) {
            /**
             * @event connection_break
             *
             */
            this._context.emit("connection_break");
        }
    }

    protected _onSocketEndAfterHandshaked(): void
    {
        this._context.emit("connection_break");
    }

    public write(messageChunk: Buffer) {        
        this._context.serialize(messageChunk);
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
        console.info("!!!!!!!!!!!!!!!!!!! socket ended");
        this.changeState("closed");
        
        /**
         * notify the observers that the transport layer has been disconnected.
         * @event close
         * @param err the Error object or null
         */
        this._context.emit("close", err || null);        
    }
}