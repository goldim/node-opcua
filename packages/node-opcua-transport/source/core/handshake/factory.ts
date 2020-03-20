import { ISerializer } from "../transport_base";
import { ServerHandshake } from "./server";
import { ClientHandshake } from "./client";
import { IHandshake } from "./base";

export class Factory
{
    constructor(){
    }

    public static getHandshake(serverSide: boolean, serer: ISerializer): IHandshake
    {
        return (serverSide) ? new ServerHandshake(serer) : new ClientHandshake(serer);
    }
}