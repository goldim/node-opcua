import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"
import { parseEndpointUrl } from "../../../core/tools";
import { createConnection, Socket } from "net";
import { IContext } from "../client"
import { State, IState } from "./base";

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class Closed extends State implements IState
{
    private _callback!: ErrorCallback;

    constructor(transport: IContext){
        super(transport);
    }

    private __createConnection(endpointUrl: string): Socket {
        const ep = parseEndpointUrl(endpointUrl);
        
        if (doDebug) {
            debugLog("endpointUrl =", endpointUrl, "ep", ep);
        }
        
        const port = parseInt( ep.port!, 10);
        const hostname = ep.hostname!;
        let socket: Socket;
        
        socket = createConnection({ host: hostname, port });

        // Setting true for noDelay will immediately fire off data each time socket.write() is called.
        socket.setNoDelay(true);

        socket.setTimeout(0);

        socket.on("timeout", () => {
            debugLog("Socket has timed out");
        });

        return socket;
    }

    public connect(endpointUrl: string, callback: ErrorCallback): void {
        try{    
            this._context.setSocket(this.__createConnection(endpointUrl));
        }
        catch (err) {
            if (doDebug) {
                debugLog("CreateClientSocket has failed");
            }
            return callback(err);
        }

        this._callback = callback;

        this._context.getSocket().once("error", this._onSocketError.bind(this));
        this._context.getSocket().once("end", this._onSocketEnd.bind(this));
        this._context.getSocket().once("connect", this._onSocketConnect.bind(this));
    }

    public disconnect(callback: ErrorCallback): void 
    {        
        assert(_.isFunction(callback), "expecting a callback function, but got " + callback);
        callback();
    }

    protected _onSocketConnect(err: Error): void 
    {        
        if (doDebug) {
            debugLog("entering _on_socket_connect");
        }
    
        this.removeListeners();
        this.changeState("established");
    }

    protected _onSocketError(err: Error): void
    {
        // this handler will catch attempt to connect to an inaccessible address.
        if (doDebug) {
            debugLog(" _on_socket_error_for_connect", err.message);
        }
        assert(err instanceof Error);
        this.removeListeners();
        this._callback(err);
    };

    protected _onSocketEnd(err: Error | null)
    {
        if (doDebug) {
            debugLog("_on_socket_end_for_connect Socket has been closed by server", err);
        }
    };

    private removeListeners(): void 
    {
        this._context.getSocket().removeListener("error", this._onSocketError);
        this._context.getSocket().removeListener("end", this._onSocketEnd);
    }
}