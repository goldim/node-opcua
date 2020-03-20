import * as _ from "underscore";
import { State, IState } from "./base";
import { Server } from "../server";

import { make_debugLog } from "node-opcua-debug";
const debugLog = make_debugLog(__filename);

export class Listening extends State implements IState
{
    constructor(server: Server) {
        super(server);
    }

    close(cb: (err?: Error) => void)
    {
        // Stops the server from accepting new connections and keeps existing connections.
        // (note from nodejs doc: This function is asynchronous, the server is finally closed
        // when all connections are ended and the server emits a 'close' event.
        // The optional callback will be called once the 'close' event occurs.
        // Unlike that event, it will be called with an Error as its only argument
        // if the server was not open when it was closed.
        this._server._impl.close(() => {            
            debugLog("Connection has been closed !");
        });
        this._server.changeState("closed");
        cb();
    }   

    public onChange(): void
    {

    }
}