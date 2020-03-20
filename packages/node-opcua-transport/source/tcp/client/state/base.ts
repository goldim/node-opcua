import * as _ from "underscore";
import { ErrorCallback } from "../../../itransport"
import { IContext } from "../client"
import { EventEmitter } from "events";

export interface IState {
    disconnect(callback: ErrorCallback): void;
    write(data: Buffer): void;
    connect(endpointUrl: string, callback: ErrorCallback): void;
    onChange(): void;
};

export abstract class State extends EventEmitter implements IState
{
    protected _context: IContext;

    constructor(ctx: IContext) {
        super();
        this._context = ctx;
    }

    public connect(endpointUrl: string, callback: ErrorCallback): void {
    }

    /**
     * disconnect the layer
     * The ```"close"``` event will be emitted to the observers with err=null.
     *
     * @method disconnect
     * @async
     * @param callback
     */
    public disconnect(callback: ErrorCallback) {
    }

    public write(messageChunk: Buffer) {
        
    }

    public changeState(state: string): void {
        this._context.changeState(state);
    }

    public onChange()
    {
    }
}