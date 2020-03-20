import * as _ from "underscore";
import { ErrorCallback } from "../../../itransport"
import { EventEmitter } from "events";
import { IContext } from "../client";

export interface IState {
    dispose(): void;
    disconnect(callback: ErrorCallback): void;
    write(data: Buffer): void;
    connect(endpointUrl: string, callback: ErrorCallback): void;

    onChange(): void;
};

export abstract class State extends EventEmitter implements IState
{
    protected _context: IContext;

    constructor(transport: IContext) {
        super();
        this._context = transport;
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
    public disconnect(callback: ErrorCallback): void {
    }

    public write(messageChunk: Buffer) {
    }

    public changeState(state: string): void {
        this._context.changeState(state);
    }

    public onChange(): void
    {

    }

    public dispose(){
    }
}