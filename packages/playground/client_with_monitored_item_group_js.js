/* jshint esversion: 6 */
"use strict";
const opcua = require("node-opcua-client");

const resolveNodeId = opcua.resolveNodeId;

const endpointUri = "opc.tcp://localhost:48010";

(async () => {

    try {

        const connectionStrategy = {
            initialDelay: 1000,
            maxDelay: 20000, // retry every 20 seconds
            maxRetry: 2 // maxRetry: 0xFFFFF // we need a large number here
        };

        const options = {
            applicationName: "ClientBrowseNextDemo",
            connectionStrategy,
            endpoint_must_exist: false,
            keepSessionAlive: false,
            requestedSessionTimeout: 60000, // 1 minute
            securityMode: opcua.MessageSecurityMode.None,
            securityPolicy: opcua.SecurityPolicy.None
        };

        const client = opcua.OPCUAClient.create(options);

        client.on("backoff", (retry, delay) => {
            console.log("Backoff ", retry, " next attempt in ", delay, "ms");
        });

        client.on("connection_lost", () => {
            console.log("Connection lost");
        });

        client.on("connection_reestablished", () => {
            console.log("Connection re-established");
        });

        client.on("connection_failed", () => {
            console.log("Connection failed");
        });
        client.on("start_reconnection", () => {
            console.log("Starting reconnection");
        });

        client.on("after_reconnection", (err) => {
            console.log("After Reconnection event =>", err);
        });

        await client.connect(endpointUri);

        const session = await client.createSession();

        const subscription = await session.createSubscription2({
            maxNotificationsPerPublish: 1000,
            publishingEnabled: true,
            requestedLifetimeCount: 100,
            requestedMaxKeepAliveCount: 10,
            requestedPublishingInterval: 1000
        });

        subscription.on("raw_notification", (n) => {
            console.log(n.toString());
        });

        const itemsToMonitor = [
            {
                attributeId: opcua.AttributeIds.Value,
                nodeId: resolveNodeId("ns=3;s=AirConditioner_1.Temperature")
            },

            {
                attributeId: opcua.AttributeIds.Value,
                nodeId: resolveNodeId("ns=3;s=AirConditioner_2.Temperature")
            },
            {
                attributeId: opcua.AttributeIds.Value,
                nodeId: resolveNodeId("ns=3;s=AirConditioner_3.Temperature")
            },
            {
                attributeId: opcua.AttributeIds.Value,
                nodeId: resolveNodeId("ns=3;s=AirConditioner_4.Temperature")
            }
        ];

        const optionsGroup = {
            discardOldest: true,
            queueSize: 1,
            samplingInterval: 10
        };

        const monitoredItemGroup = opcua.ClientMonitoredItemGroup.create(subscription, itemsToMonitor, optionsGroup, opcua.TimestampsToReturn.Both);

        // subscription.on("item_added",function(monitoredItem){
        monitoredItemGroup.on("initialized",  () => {
            console.log(" Initialized !");
        });

        monitoredItemGroup.on("changed",  (monitoredItem, dataValue, index) => {
            console.log("Changed on ", index ,  dataValue.value.toString());
        });

        await new Promise((resolve) => setTimeout(resolve, 1000000));

        await monitoredItemGroup.terminate();

        await session.close();
        await client.disconnect();
        console.log("Done !");

    } catch (err) {
        console.log("Error", err);
    }
})();
