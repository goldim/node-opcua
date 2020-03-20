import * as _ from "underscore";
import { assert } from "node-opcua-assert";

type CallbackWithData = (err: Error | null, data?: Buffer) => void;

export interface IOperationTimer {
    start(cb: CallbackWithData, timeout?: number): void;
    cancel(err: Error | null, data?: Buffer): boolean;
    reset(): void;
} 

export interface ISpecificOperationTimer
{
    startSpecific(): void;
    cancelSpecific(): void;
}

export class OpTimer implements IOperationTimer
{    
    protected _onExpired: any;
    protected _prevExpired: any;
    protected _onTimeout?: CallbackWithData;
    protected _timerId: NodeJS.Timer | null;
    protected _timeout: number;

    constructor(){
        this._timerId = null;
        this._timeout = 30000;
    }

    public start(cb: CallbackWithData, timeout?: number): void {
        assert(this._onTimeout === undefined, "callback already set");
        assert(_.isFunction(cb));
        if (timeout)
            this._timeout = timeout;
        this._onTimeout = cb;

        assert(!this._timerId, "timer already started");

        // Setup timeout detection timer 
        this._timerId = setTimeout(() => {
            this._timerId = null;
            this.cancel(
                new Error(`Timeout in waiting for data on socket ( timeout was = ${timeout} ms)`));
        }, this._timeout);

        this.startSpecific();
    }

    startSpecific(){
    }

    cancelSpecific(){
    }

    public reset() {
        if (this._timerId) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    public cancel(err: Error | null, data?: Buffer): boolean
    {
        this.reset();
        this.cancelSpecific();
        const callback = this._onTimeout;
        this._onTimeout = undefined;

        if (callback) {
            callback(err, data);
            return true;
        }
        return false;
    }
}