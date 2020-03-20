import * as _ from "underscore";
import * as WebSocket from "ws";
import { OpTimer, ISpecificOperationTimer } from "../core/OpTimer";

export class SocketOpTimer extends OpTimer implements ISpecificOperationTimer
{
    private _socket:  WebSocket.Client | null;

    constructor(socket: WebSocket.Client | null){
        super();
        this._socket = socket;
    }

    specificOp(){
        // also monitored
        if (this._socket) {
            // to do = intercept socket error as well
            this._onExpired = (err?: Error) => {
                this.cancel(
                    new Error(`ERROR in waiting for data on socket ( timeout was = ${this._timeout} ms)`));
            };            
            this._prevExpired = this._socket.onclose;
            this._socket.onclose = this._onExpired;
        }
    }

    cancelSpecific(){
        if (this._socket && this._onExpired) {
            this._socket.onclose = this._prevExpired;
            this._onExpired = null;
        }
    }
}