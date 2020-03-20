import { IState } from "./base";
import { Closed } from "./closed";
import { Listening } from "./listening";
import { Server } from "../server";

export class Factory
{
    private _states: Record<string, IState>;

    constructor(server: Server){
        this._states = {
            "closed": new Closed(server), 
            "listening": new Listening(server)
        };

    }

    public getState(state: string): IState
    {
        return this._states[state];
    }
}