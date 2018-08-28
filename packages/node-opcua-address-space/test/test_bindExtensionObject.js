/* global describe,it,before*/

"use strict";
const should = require("should");
const sinon = require("sinon");

const UADataType = require("../src/ua_data_type").UADataType;
const UAVariable = require("../src/ua_variable").UAVariable;
const Variant = require("node-opcua-variant").Variant;
const DataValue = require("node-opcua-data-value").DataValue;
const DataType = require("node-opcua-variant").DataType;
const StatusCodes = require("node-opcua-status-code").StatusCodes;
const get_mini_address_space = require("../test_helpers/get_mini_address_space").get_mini_address_space;
const SessionDiagnosticsDataType = require("node-opcua-common").SessionDiagnosticsDataType;
const ServerState = require("node-opcua-common").ServerState;

const eoan = require("../src/extension_object_array_node");

const describe = require("node-opcua-leak-detector").describeWithLeakDetector;


describe("Extension Object binding and sub  components\n", function () {

    let addressSpace;
    before(function (done) {
        get_mini_address_space(function (err, __addressSpace__) {
            addressSpace = __addressSpace__;
            done(err);
        });
    });
    after(function (done) {
        if (addressSpace) {
            addressSpace.dispose();
            addressSpace = null;
        }
        done();
    });


    describe("bindObject\n", function () {

        it("ZZ1 - should handle a Variable containing a ServiceCounterDataType", function () {

            const rootFolder = addressSpace.findNode("RootFolder");

            const serviceCounterDataType = addressSpace.findDataType("ServiceCounterDataType");
            serviceCounterDataType.browseName.toString().should.eql("ServiceCounterDataType");
            const baseVariableType = addressSpace.findVariableType("BaseVariableType");
            baseVariableType.browseName.toString().should.eql("BaseVariableType");

            const counter = 1;
            const extensionObjectVar = baseVariableType.instantiate({
                browseName: "VariableWithExtensionObject" + counter,
                dataType: serviceCounterDataType.nodeId,
                organizedBy: rootFolder.objects,
                minimumSamplingInterval: 0
            });

            extensionObjectVar.minimumSamplingInterval.should.eql(0);

            //xx console.log(extensionObjectVar.readValue());

            extensionObjectVar.readValue().value.dataType.should.eql(DataType.ExtensionObject);
            extensionObjectVar.readValue().statusCode.should.eql(StatusCodes.Good);

            extensionObjectVar.totalCount.readValue().value.dataType.should.eql(DataType.UInt32);
            extensionObjectVar.totalCount.readValue().statusCode.should.eql(StatusCodes.Good);

            const extensionObject = extensionObjectVar.bindExtensionObject();
            extensionObject.constructor.name.should.eql("ServiceCounterDataType");

            // ------------------ Changing extension object value should reflects in node Value
            extensionObjectVar.readValue().value.value.totalCount.should.eql(0);
            extensionObject.totalCount = 3;
            extensionObjectVar.readValue().value.value.totalCount.should.eql(3);
            extensionObject.totalCount = 0;

            extensionObjectVar.totalCount.readValue().value.value.should.eql(0);
            extensionObject.totalCount = 3;
            extensionObjectVar.totalCount.readValue().value.value.should.eql(3);
            extensionObject.totalCount = 0;

            const spy_on_ServerCounter_value_changed = sinon.spy();
            const spy_on_ServerCounter_TotalCount_value_changed = sinon.spy();

            extensionObjectVar.on("value_changed", spy_on_ServerCounter_value_changed);
            extensionObjectVar.totalCount.on("value_changed", spy_on_ServerCounter_TotalCount_value_changed);

            extensionObject.totalCount = 3;
            spy_on_ServerCounter_value_changed.callCount.should.eql(1);
            spy_on_ServerCounter_TotalCount_value_changed.callCount.should.eql(1);

        });

        it("ZZ2 - should handle a Variable containing a ServerStatus", function () {

            const rootFolder = addressSpace.findNode("RootFolder");

            const serverStatusDataType = addressSpace.findDataType("ServerStatusDataType");
            serverStatusDataType.browseName.toString().should.eql("ServerStatusDataType");

            const serverStatusType = addressSpace.findVariableType("ServerStatusType");
            serverStatusType.browseName.toString().should.eql("ServerStatusType");

            const counter = 1;
            const extensionObjectVar = serverStatusType.instantiate({
                browseName: "ServerStatusType" + counter,
                dataType: serverStatusDataType.nodeId,
                organizedBy: rootFolder.objects,
                minimumSamplingInterval: 0
            });

            extensionObjectVar.minimumSamplingInterval.should.eql(0);

            const extensionObject = extensionObjectVar.bindExtensionObject();
            extensionObject.constructor.name.should.eql("ServerStatusDataType");

            const spy_on_ServerStatus_value_changed = sinon.spy();
            const spy_on_ServerStatus_BuildInfo_value_changed = sinon.spy();
            const spy_on_ServerStatus_StartTime_value_changed = sinon.spy();
            const spy_on_ServerStatus_State_value_changed = sinon.spy();

            extensionObjectVar.on("value_changed", spy_on_ServerStatus_value_changed);
            extensionObjectVar.buildInfo.on("value_changed", spy_on_ServerStatus_BuildInfo_value_changed);
            extensionObjectVar.startTime.on("value_changed", spy_on_ServerStatus_StartTime_value_changed);
            extensionObjectVar.state.on("value_changed", spy_on_ServerStatus_State_value_changed);

            extensionObject.startTime = new Date();

            spy_on_ServerStatus_StartTime_value_changed.callCount.should.eql(1);
            spy_on_ServerStatus_value_changed.callCount.should.eql(1);

            extensionObject.buildInfo.productUri = "PRODUCTURI";
            spy_on_ServerStatus_BuildInfo_value_changed.callCount.should.eql(1);

            extensionObject.buildInfo.manufacturerName = "MANUFACTURER";
            spy_on_ServerStatus_BuildInfo_value_changed.callCount.should.eql(2);

            // ---------------------------------------- State ( testing Enumeration )
            extensionObject.state = ServerState.Running;
            spy_on_ServerStatus_State_value_changed.callCount.should.eql(1);
            extensionObjectVar.state.readValue().value.value.should.eql(ServerState.Running);

            extensionObject.state = ServerState.Suspended;
            spy_on_ServerStatus_State_value_changed.callCount.should.eql(2);
            extensionObjectVar.state.readValue().value.value.should.eql(ServerState.Suspended);

        });

        it("ZZ3 - should handle a Variable containing a SessionDiagnostic", function () {

            const rootFolder = addressSpace.findNode("RootFolder");

            const sessionDiagnosticsDataType = addressSpace.findDataType("SessionDiagnosticsDataType");
            sessionDiagnosticsDataType.browseName.toString().should.eql("SessionDiagnosticsDataType");

            const sessionDiagnosticsVariableType = addressSpace.findVariableType("SessionDiagnosticsVariableType");
            sessionDiagnosticsVariableType.browseName.toString().should.eql("SessionDiagnosticsVariableType");

            const counter = 1;
            const extensionObjectVar = sessionDiagnosticsVariableType.instantiate({
                browseName: "SessionDiagnostics" + counter,
                dataType: sessionDiagnosticsDataType.nodeId,
                organizedBy: rootFolder.objects,
                minimumSamplingInterval: 0
            });

            extensionObjectVar.minimumSamplingInterval.should.eql(0);
            extensionObjectVar.totalRequestCount.minimumSamplingInterval.should.eql(0);
            extensionObjectVar.totalRequestCount.totalCount.minimumSamplingInterval.should.eql(0);

            extensionObjectVar.readValue().statusCode.should.eql(StatusCodes.Good);
            extensionObjectVar.totalRequestCount.readValue().statusCode.should.eql(StatusCodes.Good);
            extensionObjectVar.totalRequestCount.totalCount.readValue().statusCode.should.eql(StatusCodes.Good);
            extensionObjectVar.totalRequestCount.errorCount.readValue().statusCode.should.eql(StatusCodes.Good);


            const extensionObject = extensionObjectVar.bindExtensionObject();
            extensionObject.constructor.name.should.eql("SessionDiagnosticsDataType");

            const spy_on_SessionDiagnostics_value_changed = sinon.spy();
            const spy_on_SessionDiagnostics_TotalRequestCount_value_changed = sinon.spy();
            const spy_on_SessionDiagnostics_TotalRequestCount_TotalCount_value_changed = sinon.spy();

            extensionObjectVar.on("value_changed", spy_on_SessionDiagnostics_value_changed);
            extensionObjectVar.totalRequestCount.on("value_changed", spy_on_SessionDiagnostics_TotalRequestCount_value_changed);
            extensionObjectVar.totalRequestCount.totalCount.on("value_changed", spy_on_SessionDiagnostics_TotalRequestCount_TotalCount_value_changed);


            extensionObjectVar.totalRequestCount.totalCount.readValue().value.value.should.eql(0);
            extensionObjectVar.totalRequestCount.readValue().value.value.totalCount.should.eql(0);
            extensionObjectVar.readValue().value.value.totalRequestCount.totalCount.should.eql(0);

            extensionObjectVar.$extensionObject.should.eql(extensionObject);

            extensionObject.totalRequestCount.totalCount = 1;

            extensionObjectVar.$extensionObject.should.eql(extensionObject);
            //xx sionObject.totalRequestCount = new Proxy(extensionObject.totalRequestCount,{});

            extensionObjectVar.readValue().value.value.totalRequestCount.totalCount.should.eql(1);
            spy_on_SessionDiagnostics_value_changed.callCount.should.eql(1);

            extensionObjectVar.totalRequestCount.readValue().value.value.totalCount.should.eql(1);
            spy_on_SessionDiagnostics_TotalRequestCount_value_changed.callCount.should.eql(1);

            //xx console.log(extensionObjectVar.totalRequestCount.totalCount.readValue());
            spy_on_SessionDiagnostics_TotalRequestCount_TotalCount_value_changed.callCount.should.eql(1);
            extensionObjectVar.totalRequestCount.totalCount.readValue().value.value.should.eql(1);


        });
    });

    describe("should be possible to bind an Extension Object properties with variable node properties", function () {

        let _sessionDiagnostics, sessionDiagnostics;

        let spy_on_sessionDiagnostics_value_changed, spy_on_sessionDiagnostics_totalRequestCount_value_changed, spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed, spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed, spy_on_sessionDiagnostics_clientDescription_value_changed;

        let counter = 0;

        beforeEach(function () {
            const rootFolder = addressSpace.findNode("RootFolder");

            const sessionDiagnosticsDataType = addressSpace.findDataType("SessionDiagnosticsDataType");
            const sessionDiagnosticsVariableType = addressSpace.findVariableType("SessionDiagnosticsVariableType");

            // the extension object
            //xx _sessionDiagnostics = addressSpace.constructExtensionObject(sessionDiagnosticsDataType, {});

            counter += 1;
            sessionDiagnostics = sessionDiagnosticsVariableType.instantiate({
                browseName: "SessionDiagnostics" + counter,
                organizedBy: rootFolder.objects
            });

            _sessionDiagnostics = sessionDiagnostics.bindExtensionObject();

            //xx console.log(_sessionDiagnostics.toString());

            // lets verify source timestamp has been set properly
            should.exist(sessionDiagnostics.readValue().sourceTimestamp);
            should.exist(sessionDiagnostics.readValue().serverTimestamp);
            //xx console.log(sessionDiagnostics.readValue().toString());

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(0);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(0);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(0);

            sessionDiagnostics.totalRequestCount.errorCount.readValue().value.value.should.eql(0);
            sessionDiagnostics.totalRequestCount.readValue().value.value.errorCount.should.eql(0);
            sessionDiagnostics.readValue().value.value.totalRequestCount.errorCount.should.eql(0);


            // install spies
            spy_on_sessionDiagnostics_value_changed = sinon.spy();
            spy_on_sessionDiagnostics_clientDescription_value_changed = sinon.spy();
            spy_on_sessionDiagnostics_totalRequestCount_value_changed = sinon.spy();
            spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed = sinon.spy();
            spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed = sinon.spy();

            sessionDiagnostics.on("value_changed", spy_on_sessionDiagnostics_value_changed);
            sessionDiagnostics.clientDescription.on("value_changed", spy_on_sessionDiagnostics_clientDescription_value_changed);
            sessionDiagnostics.totalRequestCount.on("value_changed", spy_on_sessionDiagnostics_totalRequestCount_value_changed);
            sessionDiagnostics.totalRequestCount.totalCount.on("value_changed", spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed);
            sessionDiagnostics.totalRequestCount.errorCount.on("value_changed", spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed);
        });

        it("ZA1- a ExtensionObject variable should have the expected dataType node", function () {
            const dataTypeNode = sessionDiagnostics.getDataTypeNode();

            dataTypeNode.browseName.toString().should.eql("SessionDiagnosticsDataType");
            const structure = addressSpace.findDataType("Structure");
            dataTypeNode.isSupertypeOf(structure).should.eql(true);
            dataTypeNode.definition.map(function (x) {
                return x.name
            }).sort().should.eql([
                "ActualSessionTimeout",
                "AddNodesCount",
                "AddReferencesCount",
                "BrowseCount",
                "BrowseNextCount",
                "CallCount",
                "ClientConnectionTime",
                "ClientDescription",
                "ClientLastContactTime",
                "CreateMonitoredItemsCount",
                "CreateSubscriptionCount",
                "CurrentMonitoredItemsCount",
                "CurrentPublishRequestsInQueue",
                "CurrentSubscriptionsCount",
                "DeleteMonitoredItemsCount",
                "DeleteNodesCount",
                "DeleteReferencesCount",
                "DeleteSubscriptionsCount",
                "EndpointUrl",
                "HistoryReadCount",
                "HistoryUpdateCount",
                "LocaleIds",
                "MaxResponseMessageSize",
                "ModifyMonitoredItemsCount",
                "ModifySubscriptionCount",
                "PublishCount",
                "QueryFirstCount",
                "QueryNextCount",
                "ReadCount",
                "RegisterNodesCount",
                "RepublishCount",
                "ServerUri",
                "SessionId",
                "SessionName",
                "SetMonitoringModeCount",
                "SetPublishingModeCount",
                "SetTriggeringCount",
                "TotalRequestCount",
                "TransferSubscriptionsCount",
                "TranslateBrowsePathsToNodeIdsCount",
                "UnauthorizedRequestCount",
                "UnregisterNodesCount",
                "WriteCount",
            ]);
        });

        it("ZA2- sessionDiagnostics should have a dataValue with the expected ExtensionObjectType", function () {
            const extensionObject = sessionDiagnostics.readValue().value.value;
            extensionObject.constructor.name.should.eql("SessionDiagnosticsDataType");
        });

        it("ZA3- updateExtensionObjectPartial: it should be possible to cascade changes by acting on the whole ExtensionObject", function () {

            spy_on_sessionDiagnostics_clientDescription_value_changed.callCount.should.eql(0);

            const someClientDescription = /* new ApplicationDescription( */{
                /* ApplicationDescription */
                applicationUri: "applicationUri-1"
            }/*)*/;

            sessionDiagnostics.updateExtensionObjectPartial({clientDescription: someClientDescription});

            spy_on_sessionDiagnostics_clientDescription_value_changed.callCount.should.eql(1);
            spy_on_sessionDiagnostics_value_changed.callCount.should.eql(1);

            sessionDiagnostics.clientDescription.applicationUri.readValue().value.value.should.eql("applicationUri-1");
            sessionDiagnostics.clientDescription.readValue().value.value.applicationUri.should.eql("applicationUri-1");
            sessionDiagnostics.readValue().value.value.clientDescription.applicationUri.should.eql("applicationUri-1");

            _sessionDiagnostics.clientDescription.applicationUri.should.eql("applicationUri-1");

            spy_on_sessionDiagnostics_totalRequestCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed.callCount.should.eql(0);

            const eo = sessionDiagnostics.constructExtensionObjectFromComponents();
            eo.clientDescription.applicationUri.should.eql("applicationUri-1");

            //xx console.log(eo.toString());

        });

        it("ZA4- updateExtensionObjectPartial: it should be possible to cascade changes by acting on the whole ExtensionObject - middle", function () {

            spy_on_sessionDiagnostics_totalRequestCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed.callCount.should.eql(0);

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(0);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(0);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(0);
            _sessionDiagnostics.totalRequestCount.totalCount.should.eql(0);


            const totalRequestCount = /* new Counter( */{
                totalCount: 130,
                errorCount: 25
            };
            sessionDiagnostics.updateExtensionObjectPartial({totalRequestCount: totalRequestCount});

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(130);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(130);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(130);
            _sessionDiagnostics.totalRequestCount.totalCount.should.eql(130);

            sessionDiagnostics.totalRequestCount.errorCount.readValue().value.value.should.eql(25);
            sessionDiagnostics.totalRequestCount.readValue().value.value.errorCount.should.eql(25);
            sessionDiagnostics.readValue().value.value.totalRequestCount.errorCount.should.eql(25);
            _sessionDiagnostics.totalRequestCount.errorCount.should.eql(25);

        });

        it("ZA5- incrementExtensionObjectPartial: it should be possible to cascade changes by increasing a value on ExtensionObject", function () {

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(0);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(0);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(0);
            _sessionDiagnostics.totalRequestCount.totalCount.should.eql(0);

            spy_on_sessionDiagnostics_totalRequestCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed.callCount.should.eql(0);


            sessionDiagnostics.incrementExtensionObjectPartial("totalRequestCount.totalCount");

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(1);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(1);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(1);
            _sessionDiagnostics.totalRequestCount.totalCount.should.eql(1);

            sessionDiagnostics.incrementExtensionObjectPartial("totalRequestCount.totalCount");

            sessionDiagnostics.totalRequestCount.totalCount.readValue().value.value.should.eql(2);
            sessionDiagnostics.totalRequestCount.readValue().value.value.totalCount.should.eql(2);
            sessionDiagnostics.readValue().value.value.totalRequestCount.totalCount.should.eql(2);
            _sessionDiagnostics.totalRequestCount.totalCount.should.eql(2);

            spy_on_sessionDiagnostics_totalRequestCount_value_changed.callCount.should.eql(2);
            spy_on_sessionDiagnostics_totalRequestCount_errorCount_value_changed.callCount.should.eql(0);
            spy_on_sessionDiagnostics_totalRequestCount_totalCount_value_changed.callCount.should.eql(2);


        });

        it("ZA6- changing property values in extension object directly should propagates changes and notification to NodeVariables", function () {


            _sessionDiagnostics.clientDescription.applicationUri = "applicationUri-1";


            sessionDiagnostics.clientDescription.applicationUri.readValue().value.value.should.eql("applicationUri-1");
            sessionDiagnostics.clientDescription.readValue().value.value.applicationUri.should.eql("applicationUri-1");
            sessionDiagnostics.readValue().value.value.clientDescription.applicationUri.should.eql("applicationUri-1");


        });
    });

});
