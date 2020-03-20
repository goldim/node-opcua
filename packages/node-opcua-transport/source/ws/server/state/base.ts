import * as _ from "underscore";
import { EventEmitter } from "events";
import { Server } from "../server";

export interface IState {
    listen(cb: (err?: Error) => void): void;
    close(cb: (err?: Error) => void): void;
    onChange(): void;
};

export abstract class State extends EventEmitter implements IState
{
    protected _server: Server;

    constructor(server: Server) {
        super();
        this._server = server;
    }    

    listen(cb: (err?: Error) => void)
    {

    }

    close(cb: (err?: Error) => void)
    {

    }
    
    public changeState(state: string): void {
        this._server.changeState(state);
    }

    public onChange(): void
    {
    }
}