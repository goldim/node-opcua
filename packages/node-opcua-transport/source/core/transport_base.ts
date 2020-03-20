import { ErrorCallback } from "../itransport"
import { EventEmitter } from "events";
import * as _ from "underscore";
import { OpcSerializer, IStatistics, Statistics } from "../core/OpcSerializer";
import { IOperationTimer } from "../core/OpTimer";

import * as os from "os";
const gHostname = os.hostname();

export type CallbackWithData = (err: Error | null, data?: Buffer) => void;

export interface ISerializer {
    serialize(data: Buffer): void;
    deserialize(data: Buffer, length: number): void;
}

export abstract class TransportBase extends EventEmitter implements ISerializer 
{
    public numberOfRetry: number;
    public name: string;
    public endpoint: string;
    public serverUri: string;
    public _serializer: OpcSerializer;
    public timeout: number;
    public _timer!: IOperationTimer;
    public _stats: IStatistics;
    public _errorCb: ErrorCallback | null;

    public receiveBufferSize: number;
    public sendBufferSize: number;
    public maxMessageSize: number;
    public maxChunkCount: number;

    constructor(){
        super();

        this.numberOfRetry = 0;
        this.name = this.constructor.name;
        this.timeout = 30000;
        this.endpoint = "";
        this._errorCb = null;
        this.serverUri = "urn:" + gHostname + ":Sample";

        this.receiveBufferSize = 0;
        this.sendBufferSize = 0;
        this.maxMessageSize = 0;
        this.maxChunkCount = 0;
        
        this._stats = new Statistics();
        this._serializer = new OpcSerializer(this._stats);
    }

    public serialize(messageChunk: Buffer)
    {
        this._serializer.write(messageChunk);
    }

    public deserialize(messageChunk: Buffer, length: number)
    {
        this._serializer.read(messageChunk, length);
    }

    get bytesWritten(): number {
        return this._stats.bytesWritten;
    }

    get bytesRead(): number {
        return this._stats.bytesRead;
    }

    get chunkWrittenCount(): number {
        return this._stats.chunkWrittenCount;
    }

    get chunkReadCount(): number {
        return this._stats.chunkReadCount;
    }
}