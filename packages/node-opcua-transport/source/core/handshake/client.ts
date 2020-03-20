import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import { ISerializer } from "../transport_base"
import { Handshake, IHandshake } from "./base";
import { ErrorCallback } from "../../itransport"
import { IOperationTimer } from "../OpTimer";

import * as debug from "node-opcua-debug";
const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

export class ClientHandshake extends Handshake implements IHandshake
{   
    constructor(serializer: ISerializer){        
        super(serializer);
    }

    public start(callback: ErrorCallback, timer: IOperationTimer, url: string){
        assert(_.isFunction(callback));
        assert(url.length > 0, " expecting a valid endpoint url");
        this._counter = 0;
        this._url = url;
        if (doDebug) {
            debugLog("start handshake");
        }

        timer.start((err: Error | null, data?: Buffer) => {
            if (doDebug) {
                debugLog("before ACK response");
            }
            this.onResponseACK(callback, err, data);
        });

        this.requestHELLO();
    }
}