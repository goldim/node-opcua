import * as _ from "underscore";
import { Socket } from "net";
import { OpTimer, ISpecificOperationTimer } from "../core/OpTimer";

export class SocketOpTimer extends OpTimer implements ISpecificOperationTimer
{
    private _socket: Socket | null;

    constructor(socket: Socket | null){
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
            this._socket.on("close", this._onExpired);
        }
    }

    cancelSpecific(){
        if (this._socket && this._onExpired) {
            this._socket.removeListener("close", this._onExpired);
            this._onExpired = null;
        }
    }   
}