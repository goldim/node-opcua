
import { EventEmitter } from "events";
import { IServer, AcceptCallback, IStream, IConnection } from "../../itransport";
import { Client } from "../client/client";
import { IState } from "./state/base";
import { Closed } from "./state/closed";
import { Factory } from "./state/factory";
import { Server as SocketServer } from "ws";
import * as WebSocket from "ws";
import * as _ from "underscore";
import * as chalk from "chalk";
import { assert } from "node-opcua-assert";

import { checkDebugFlag, make_debugLog } from "node-opcua-debug";
const debugLog = make_debugLog(__filename);
const doDebug = checkDebugFlag(__filename);

export class Server extends EventEmitter implements IServer 
{
    public _impl!: SocketServer;
    public _state!: IState;
    private _stateFactory: Factory; 
    public port: number;
    public maxConnections: number;
    public onClientConnectionCb!: AcceptCallback;

    constructor(port?: number, maxConnections?: number) {
        super();
        if (!port) port = 0;
        this.port = parseInt(port.toString(), 10);
        assert(_.isNumber(this.port));
        this.maxConnections = maxConnections || 20;
        this._stateFactory = new Factory(this);
        this.changeState("closed");
    }
    
    public setAcceptHandler(cb: AcceptCallback)
    {
        this.onClientConnectionCb = cb;
    }

    public shutdown(socket: WebSocket.Client)
    {
        debugLog(chalk.bgWhite.cyan("OPCUAServerEndPoint#_on_client_connection " +
            "The maximum number of connection has been reached - Connection is refused"));
        (socket as any).destroy();
    }

    public onClientConnection(socket: WebSocket.Client){
        debugLog("OPCUAServerEndPoint#_on_client_connection");
        if (this._state.constructor.name == Closed.name) {
            debugLog(chalk.bgWhite.cyan("OPCUAServerEndPoint#_on_client_connection " +
              "SERVER END POINT IS PROBABLY SHUTTING DOWN !!! - Connection is refused"));
            return;
        }
        
        let con:IConnection = new Client(socket);
        con.on("connect", (stream:IStream) => {
            this.onClientConnectionCb(stream);
        });
    }

    private _dump_statistics() {
    }

    /**
     * @method listen
     * @async
     */
    public listen(cb: (err?: Error) => void) {
        this._state.listen(cb);
    }

    public dispose() {
        this.removeAllListeners();
    }

    public close(cb: (err?: Error) => void) {
        this._state.close(cb);
    }

    public isListening(): boolean {
        return this._state && this._state.constructor.name !== Closed.name;
    }

    public changeState(state: string): void
    {
        this._state = this._stateFactory.getState(state);
        this._state.onChange();
    }
}