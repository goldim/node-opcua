import * as _ from "underscore";
import * as debug from "node-opcua-debug";
import { ErrorCallback } from "../../../itransport"
import { parseEndpointUrl } from "../../../core/tools";
import { IContext } from "../client"
import { State } from "./base";
import * as WebSocket from "ws";

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class Closed extends State
{
    constructor(ctx: IContext){
        super(ctx);
    }

    private __createSocket(endpointUrl: string): WebSocket.Client {
        const ep = parseEndpointUrl(endpointUrl);
        const port = parseInt( ep.port!, 10);
        const hostname = ep.hostname!;
        return new WebSocket.Client("ws://" + hostname + ":" + port + "/");
    }

    public connect(endpointUrl: string, callback: ErrorCallback): void {
        try{
            this._context.setSocket(this.__createSocket(endpointUrl));
        }
        catch (err) {
            if (doDebug) {
                debugLog("CreateClientSocket has failed");
            }
            return callback(err);
        }
        
        this._context.getSocket().onclose = (event: WebSocket.CloseEvent) => this._onSocketEnd(event);
        this._context.getSocket().onerror = (event: WebSocket.ErrorEvent) => this._onSocketError(event);
        this._context.getSocket().onopen =  (event: WebSocket.OpenEvent) => this._onSocketConnect(event);
    }

    protected _onSocketConnect(event: WebSocket.OpenEvent): void 
    {
        if (doDebug) {
            debugLog("entering _on_socket_connect");
        }
        
        this.changeState("established");
    }

    public _onSocketError(event: WebSocket.ErrorEvent): void
    {
        // this handler will catch attempt to connect to an inaccessible address.
        if (doDebug) {
            debugLog(" _on_socket_error_for_connect", event);
        }

        if (event.hasOwnProperty("message"))
        {
            var error = new Error();
            error.message = event.message;
            this._context.callErrorCb(error);
        }
    }

    protected _onSocketEnd(event: WebSocket.CloseEvent)
    {
        if (!event.wasClean)
        {
            var error = new Error();
            switch(event.code)
            {
                case 1006:
                    error.message = "ECONNREFUSED";
                    break;
                case 1002:
                    error.message = "BadProtocolVersionUnsupported";
                    break;
                default:
                    error.message = event.reason;
            }            
            
            this._context.callErrorCb(error);
        }
    }
}