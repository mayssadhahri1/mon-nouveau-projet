const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Simulation RxDB avec un tableau en mémoire
let deliveries = [];
let idCounter = 1;

const packageDef = protoLoader.loadSync("../proto/delivery.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const deliveryPackage = grpcObject.delivery;

// ========================
// Implémentation gRPC
// ========================
function AssignDelivery(call, callback) {
    const { order_id, address } = call.request;
    const delivery = {
        id: String(idCounter++),
        order_id,
        address,
        status: "assigned",
    };
    deliveries.push(delivery);
    console.log("Delivery assigned:", delivery);
    callback(null, delivery);
}

function GetDelivery(call, callback) {
    const delivery = deliveries.find((d) => d.id === call.request.id);
    if (!delivery)
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Delivery not found",
        });
    callback(null, delivery);
}

function GetDeliveries(call, callback) {
    callback(null, { deliveries });
}

function UpdateDeliveryStatus(call, callback) {
    const { id, status } = call.request;
    const delivery = deliveries.find((d) => d.id === id);
    if (!delivery)
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Delivery not found",
        });
    delivery.status = status;
    callback(null, delivery);
}

// ========================
// Démarrer le serveur gRPC
// ========================
const server = new grpc.Server();
server.addService(deliveryPackage.DeliveryService.service, {
    AssignDelivery,
    GetDelivery,
    GetDeliveries,
    UpdateDeliveryStatus,
});

server.bindAsync(
    "0.0.0.0:50052",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("🚚 Delivery Service running on port 50052");
    }
);