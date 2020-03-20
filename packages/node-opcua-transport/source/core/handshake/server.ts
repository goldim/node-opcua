import { ISerializer } from "../transport_base"
import { Handshake, IHandshake } from "./base";
import { ErrorCallback } from "../../itransport"
import { IOperationTimer } from "../OpTimer";

import * as debug from "node-opcua-debug";
const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class ServerHandshake extends Handshake implements IHandshake
{   
    constructor(serializer: ISerializer){
        super(serializer);
    }

    public start(cb: ErrorCallback, timer: IOperationTimer, url: string)
    {
        timer.start((err: Error | null, data?: Buffer) => {
            if (doDebug) {
                debugLog("before ACK response");
            }
            if (err) {
                console.info("err: ", err);
                // this._abortWithError(StatusCodes.BadConnectionRejected, err.message, callback);
            } else {
                console.info("no error");
                if (!data) {
                    throw new Error("Invalid Data");
                }
                // handle the HEL message
                this.onResponseHello(data, cb);
            }
        });
    }
}