import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"
import { IContext } from "../client"
import { State } from "./base";
import * as WebSocket from "ws";

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class Handshaked extends State
{
    constructor(client: IContext){
        super(client);
    }

    public onChange(): void {
        if (!this._context.getSocket()) {
            throw new Error("internal error");
        }
        // install error handler to detect connection break
        this._context.getSocket().onerror = this._onSocketErrorAfterHandshaked.bind(this);
    }

    protected _onSocketErrorAfterHandshaked(event: WebSocket.ErrorEvent): void
    {
        if (doDebug) {
            debugLog(" _on_socket_error_after_connection ClientTCP_transport Socket Error", event.message);
        }
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
        this.changeState("closed");
        /**
         * notify the observers that the transport layer has been disconnected.
         * @event close
         * @param err the Error object or null
         */
        this._context.emit("close", err || null);
    }
}