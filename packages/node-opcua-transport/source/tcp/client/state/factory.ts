import { IState } from "./base";
import { Closed } from "./closed";
import { Established } from "./established";
import { Handshaked } from "./handshaked";
import { IContext } from "../client";

export class Factory
{
    private _states: Record<string, IState>;
    private _context: IContext;

    constructor(ctx: IContext){
        this._context = ctx;
        this._states = {
            "closed": new Closed(this._context), 
            "established": new Established(this._context),
            "handshaked": new Handshaked(this._context)
        };
    }

    public getState(state: string): IState
    {
        return this._states[state];
    }
}