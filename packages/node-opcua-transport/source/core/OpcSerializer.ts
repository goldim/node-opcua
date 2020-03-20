import { EventEmitter } from "events";

import * as _ from "underscore";
import { assert } from "node-opcua-assert";
import { writeTCPMessageHeader } from "./tools";
import { createFastUninitializedBuffer } from "node-opcua-buffer-utils";
import { readRawMessageHeader } from "./message_builder_base";
import { PacketAssembler } from "node-opcua-packet-assembler";

export type CallbackWithData = (err: Error | null, data?: Buffer) => void;
export type OpcWriteCallback = (data: Buffer) => boolean;
export type OpcReadCallback = (data: Buffer) => boolean;

export interface IStatistics {
    bytesWritten: number;
    bytesRead: number;
    chunkWrittenCount: number;
    chunkReadCount: number;

    read(messageChunk: Buffer): void;
    write(messageChunk: Buffer): void;
}

export class Statistics implements IStatistics
{
    public bytesWritten: number;
    public bytesRead: number;
    public chunkWrittenCount: number;
    public chunkReadCount: number;

    constructor() {
        this.bytesWritten = 0;
        this.bytesRead = 0;
        this.chunkWrittenCount = 0;
        this.chunkReadCount = 0;
    }

    public read(messageChunk: Buffer): void
    {
        this.bytesRead += messageChunk.length;
        this.chunkReadCount++;
    }

    public write(messageChunk: Buffer): void
    {
        this.bytesWritten += messageChunk.length;
        this.chunkWrittenCount++;
    }
}

export class OpcSerializer extends EventEmitter {
    private __pendingBuffer?: any;    
    /**
     * the size of the header in bytes
     * @default  8
     */
    protected readonly headerSize: 8;
    private __packetAssembler?: PacketAssembler;
    protected _writeCb!: OpcWriteCallback;
    protected _readCb!: OpcReadCallback;
    protected _stats: Statistics;

    constructor(stats: IStatistics){
        super();
        this._stats = stats;
        this.headerSize = 8;
        this.__pendingBuffer = undefined;
    }

    public init(cb1: OpcReadCallback, cb2: OpcWriteCallback): void
    {
        this._readCb = cb1;
        this._writeCb = cb2;
        this.__createAssembler();
    }

    /**
     * ```createChunk``` is used to construct a pre-allocated chunk to store up to ```length``` bytes of data.
     * The created chunk includes a prepended header for ```chunk_type``` of size ```self.headerSize```.
     *
     * @method createChunk
     * @param msgType
     * @param chunkType {String} chunk type. should be 'F' 'C' or 'A'
     * @param length
     * @return a buffer object with the required length representing the chunk.
     *
     * Note:
     *  - only one chunk can be created at a time.
     *  - a created chunk should be committed using the ```write``` method before an other one is created.
     */
    public createChunk(msgType: string, chunkType: string, length: number): Buffer {

        assert(msgType === "MSG");
        assert(this.__pendingBuffer === undefined, "createChunk has already been called ( use write first)");

        const totalLength = length + this.headerSize;
        const buffer = createFastUninitializedBuffer(totalLength);
        writeTCPMessageHeader("MSG", chunkType, totalLength, buffer);

        this.__pendingBuffer = buffer;

        return buffer;
    }

     /**
     * write the message_chunk on the socket.
     * @method write
     * @param messageChunk
     *
     * Notes:
     *  - the message chunk must have been created by ```createChunk```.
     *  - once a message chunk has been written, it is possible to call ```createChunk``` again.
     *
     */
    public write(messageChunk: Buffer) 
    {
        assert((this.__pendingBuffer === undefined)
            || this.__pendingBuffer === messageChunk, " write should be used with buffer created by createChunk");

        const header = readRawMessageHeader(messageChunk);
        assert(header.length === messageChunk.length, "length " + header.length + " " + messageChunk.length);
        assert(["F", "C", "A"].indexOf(header.messageHeader.isFinal) !== -1, "isfinal " + header.messageHeader.isFinal);
        this.write_internal(messageChunk);
        this.__pendingBuffer = undefined;
    }   

    public write_internal(messageChunk: Buffer) 
    {
        if (this._writeCb(messageChunk))
        {
            this._stats.write(messageChunk);
        }
    }

    public read(data: Buffer, length: number): void
    {
        if (!this.__packetAssembler) {
            throw new Error("internal Error");
        }
        
        if (length > 0) {
            this.__packetAssembler.feed(data);
        }
    }

    private __createAssembler(): void {
        this.__packetAssembler = new PacketAssembler({
            readMessageFunc: readRawMessageHeader,
            minimumSizeInBytes: this.headerSize
        });

        if (!this.__packetAssembler) {
            throw new Error("Internal Error");
        }
        
        this.__packetAssembler.on("message", (messageChunk: Buffer) => this._onRead(messageChunk));
    }

    private _onRead(messageChunk: Buffer) {
        if (this._readCb(messageChunk))
        {
            this._stats.read(messageChunk);
        }
    }
}