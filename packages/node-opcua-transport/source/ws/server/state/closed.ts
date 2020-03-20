import * as _ from "underscore";
import { State, IState } from "./base";
import { Server } from "../server";
import { assert } from "node-opcua-assert";
import * as chalk from "chalk";
import { Server as SocketServer } from "ws";

import { make_debugLog } from "node-opcua-debug";
const debugLog = make_debugLog(__filename);

export class Closed extends State implements IState
{
    private _listen_callback: any;

    constructor(server: Server) {
        super(server);

        this._listen_callback = null;
    }

    public listen(cb: (err?: Error) => void)
    {
        assert(_.isFunction(cb));
        this._listen_callback = cb;

        this._server._impl = new SocketServer({
            port: this._server.port
        });

        this._server._impl.on("error", (err: Error) => {
            debugLog(chalk.red.bold(" error") + " port = " + this._server.port, err);
            this._server.changeState("closed");
            this._end_listen(err);
        });

        this._server._impl.on("connection", this._server.onClientConnection.bind(this._server));

        this._server._impl.on("listening", (socket: WebSocket, error: Error) => {
            debugLog("server is listening");
            debugLog(chalk.green.bold("LISTENING TO PORT "), this._server.port, error);
            this._server.changeState("listening");
            this._end_listen();
        });
    }

    private _end_listen(err?: Error) {
        assert(_.isFunction(this._listen_callback));
        this._listen_callback(err);
        this._listen_callback = null;
    }

    public close(cb: (err?: Error) => void)
    {
        cb(new Error("Connection already suspended !!"));
    }

    public onChange(): void
    {
    }
}