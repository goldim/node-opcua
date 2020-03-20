
import { EventEmitter } from "events";
import { IStream, IServer, IConnection, AcceptCallback } from "../../itransport";
import { Client } from "../client/client";
import { IState } from "./state/base";
import { Closed } from "./state/closed";
import { Factory } from "./state/factory";
import * as net from "net";
import { Server as SocketServer, Socket } from "net";
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
    public clients: Array<Socket>;
    public maxConnections: number;
    private onClientConnectionCb!: AcceptCallback;

    constructor(port?: number, maxConnections?: number) {
        super();
        this.clients = new Array<Socket>(8);
        this._setup_server();
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

    public shutdown(socket: Socket){
        debugLog(chalk.bgWhite.cyan("OPCUAServerEndPoint#_on_client_connection " +
            "The maximum number of connection has been reached - Connection is refused"));
        socket.end();
        (socket as any).destroy();
    }

    protected onClientConnection(socket: Socket){
        // a client is attempting a connection on the socket
        (socket as any).setNoDelay(true);

        debugLog("OPCUAServerEndPoint#_on_client_connection");
        if (this._state.constructor.name == Closed.name) {
            debugLog(chalk.bgWhite.cyan("OPCUAServerEndPoint#_on_client_connection " +
              "SERVER END POINT IS PROBABLY SHUTTING DOWN !!! - Connection is refused"));
            socket.end();
            return;
        }
        
        let con:IConnection = new Client(socket);
        con.on("connect", (stream:IStream) => {
            this.onClientConnectionCb(stream);
        });
    }

    private _dump_statistics() {
        const self = this._impl;
        self.getConnections((err: Error | null, count: number) => {
            debugLog(chalk.cyan("CONCURRENT CONNECTION = "), count);
        });
        debugLog(chalk.cyan("MAX CONNECTIONS = "), self.maxConnections);
    }

    private _setup_server() {
        assert(!this._impl);
        
        this._impl = net.createServer(
            // { pauseOnConnect: true }
            (c)=>{       
                this.onClientConnection(c);
            }
        );
        
        // xx console.log(" Server with max connections ", self.maxConnections);
        this._impl.maxConnections = this._impl.maxConnections + 1; // plus one extra
        
        this._impl.on("connection", (socket: Socket) => {
            // istanbul ignore next
            if (doDebug) {
                this._dump_statistics();
                debugLog("server connected  with : " +
                  (socket as any).remoteAddress + ":" + (socket as any).remotePort);
            }
        }).on("close", () => {
            debugLog("server closed : all connections have ended");
        }).on("error", (err: Error) => {
            // this could be because the port is already in use
            debugLog(chalk.red.bold("server error: "), err.message);
        });
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

    public isListening(): boolean {
        return this._state && this._state.constructor.name !== Closed.name;
    }

    public close(cb: (err?: Error) => void) {
        this._state.close(cb);
    }

    public changeState(state: string): void
    {
        this._state = this._stateFactory.getState(state);
        this._state.onChange();
    }
}