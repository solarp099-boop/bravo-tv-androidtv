require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MongoClient } = require("mongodb");


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI no está configurado en .env");
    process.exit(1);
}

if (!API_KEY) {
    console.error("❌ API_KEY no está configurado en .env");
    process.exit(1);
}

const client = new MongoClient(MONGO_URI);

let db;
let channelsCollection;

async function conectarMongoDB() {

    try {

        await client.connect();

        db = client.db("bravotv_androidtv");
        channelsCollection = db.collection("channels");

        console.log("✅ Conectado a MongoDB Atlas");
        console.log("✅ Base de datos: bravotv_androidtv");
        console.log("✅ Colección: channels");

    } catch (error) {

        console.error("❌ Error conectando a MongoDB:");
        console.error(error);

        process.exit(1);
    }
}

app.get("/", (req, res) => {

    res.send("✅ Bravo TV - Android TV Panel funcionando");

});

app.get("/test-db", async (req, res) => {

    try {

        if (!channelsCollection) {

            return res.status(500).json({
                ok: false,
                error: "MongoDB todavía no está conectado"
            });

        }

        const total =
            await channelsCollection.countDocuments();

        res.json({
            ok: true,
            mongodb: true,
            database: "bravotv_androidtv",
            collection: "channels",
            totalChannels: total
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            error: "Error consultando MongoDB"
        });
    }

});

// ===============================
// PANEL ADMINISTRATIVO
// ===============================

app.get("/admin", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).send("No autorizado");
    }

    try {

        const channels =
            await channelsCollection
                .find({})
                .sort({ createdAt: 1 })
                .toArray();


        let rows = "";


        channels.forEach(channel => {

            rows +=
                '<tr id="row-' + channel._id + '">' +

                '<td>' +
                '<input ' +
                'class="input input-number" ' +
                'id="numero-' + channel._id + '" ' +
                'value="' + (channel.numero || "") + '">' +
                '</td>' +

                '<td>' +
                '<input ' +
                'class="input" ' +
                'id="nombre-' + channel._id + '" ' +
                'value="' + (channel.nombre || "") + '">' +
                '</td>' +

                '<td>' +
                '<input ' +
                'class="input input-url" ' +
                'id="url-' + channel._id + '" ' +
                'value="' + (channel.url || "") + '">' +
                '</td>' +

                '<td>' +
                '<input ' +
                'class="input" ' +
                'id="logo-' + channel._id + '" ' +
                'value="' + (channel.logo || "") + '">' +
                '</td>' +

                '<td>' +
                '<input ' +
                'class="input" ' +
                'id="epg-' + channel._id + '" ' +
                'value="' + (channel.epgId || "") + '">' +
                '</td>' +

                '<td class="status-cell" id="status-' + channel._id + '">' +
(
    channel.status === "online"
        ? "🟢"
        : channel.status === "offline"
            ? "🔴"
            : "⚫"
) +
'</td>' +

                '<td class="actions">' +

                '<button ' +
                'class="btn-save" ' +
                'onclick="actualizarCanal(\'' + channel._id + '\')">' +
                '💾' +
                '</button>' +

                '<button ' +
                'class="btn-delete" ' +
                'onclick="eliminarCanal(\'' + channel._id + '\')">' +
                '🗑' +
                '</button>' +

                '</td>' +

                '</tr>';

        });


        if (rows === "") {

            rows =
                '<tr>' +
                '<td colspan="7" class="empty">' +
                'Todavía no hay canales.' +
                '</td>' +
                '</tr>';

        }


        const html = `

<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Bravo TV - Android TV</title>

<style>

:root {

    --bg: #0f0f0f;
    --card: #1a1a1a;
    --border: #303030;
    --primary: #3d5afe;
    --success: #28a745;
    --danger: #ff1744;
    --text: #ffffff;
    --muted: #999999;

}

* {

    box-sizing: border-box;

}

body {

    margin: 0;

    padding: 20px;

    font-family: "Segoe UI", Arial, sans-serif;

    background: var(--bg);

    color: var(--text);

}

.header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 20px;

    padding-bottom: 15px;

    margin-bottom: 20px;

    border-bottom: 1px solid var(--border);

}

.header h1 {

    margin: 0;

    font-size: 25px;

}

.card {

    background: var(--card);

    border: 1px solid var(--border);

    border-radius: 12px;

    padding: 20px;

    margin-bottom: 20px;

}

.add-grid {

    display: grid;

    grid-template-columns:
        90px
        1fr
        2fr
        2fr
        1fr
        auto;

    gap: 10px;

    align-items: center;

}

.input {

    width: 100%;

    padding: 9px;

    background: #080808;

    border: 1px solid #333;

    color: white;

    border-radius: 6px;

}

.input-number {

    text-align: center;

}

.input-url {

    min-width: 300px;

}

.btn {

    border: none;

    border-radius: 6px;

    padding: 10px 16px;

    cursor: pointer;

    font-weight: bold;

}

.btn-add {

    background: var(--success);

    color: white;

}

.btn-save {

    border: none;

    border-radius: 6px;

    padding: 8px 12px;

    cursor: pointer;

    background: #444;

    color: white;

    margin-right: 5px;

}

.btn-delete {

    border: none;

    border-radius: 6px;

    padding: 8px 12px;

    cursor: pointer;

    background: var(--danger);

    color: white;

}

.actions {

    white-space: nowrap;

}

table {

    width: 100%;

    border-collapse: collapse;

}

th,

td {

    padding: 10px;

    border-bottom: 1px solid #292929;

    vertical-align: middle;

}

th {

    color: var(--muted);

    text-align: left;

    font-size: 13px;

}

.status-cell {

    text-align: center;

    font-size: 18px;

}

.empty {

    text-align: center;

    color: var(--muted);

    padding: 30px;

}

.table-wrapper {

    overflow-x: auto;

}

table {

    min-width: 1200px;

}

.count {

    color: var(--muted);

    font-size: 14px;

}

.logo-preview {

    width: 40px;

    height: 40px;

    object-fit: contain;

    background: #000;

    border-radius: 5px;

    border: 1px solid #333;

}

</style>

</head>

<body>


<div class="header">

    <h1>
        📺 Bravo TV - Android TV
    </h1>

    <div class="count">
        Canales: ${channels.length}
    </div>

</div>


<div class="card">

    <h2>
        ➕ Agregar canal
    </h2>


    <div class="add-grid">

        <input
            id="nuevoNumero"
            class="input"
            placeholder="N°"
        >


        <input
            id="nuevoNombre"
            class="input"
            placeholder="Nombre"
        >


        <input
            id="nuevoUrl"
            class="input"
            placeholder="URL M3U8"
        >


        <input
            id="nuevoLogo"
            class="input"
            placeholder="URL Logo"
        >


        <input
            id="nuevoEpg"
            class="input"
            placeholder="EPG ID"
        >


        <button
            class="btn btn-add"
            onclick="agregarCanal()"
        >
            Agregar
        </button>

    </div>

</div>


<div class="card">

    <h2>
        📡 Lista de canales
    </h2>


    <div class="table-wrapper">

        <table>

            <thead>

                <tr>

                    <th>N°</th>

                    <th>Nombre</th>

                    <th>URL M3U8</th>

                    <th>Logo</th>

                    <th>EPG ID</th>

                    <th>Estado</th>

                    <th>Acciones</th>

                </tr>

            </thead>


            <tbody>

                ${rows}

            </tbody>

        </table>

    </div>

</div>


<script>

const API_KEY = "${API_KEY}";

async function actualizarEstados() {

    try {

        const response =
            await fetch(
                "/api/channels?key=" + API_KEY
            );

        const data =
            await response.json();

        if (!data.ok || !data.channels) {
            return;
        }

        data.channels.forEach(channel => {

            const statusCell =
                document.getElementById(
                    "status-" + channel._id
                );

            if (!statusCell) {
                return;
            }

            if (channel.status === "online") {

                statusCell.innerText = "🟢";

            } else if (channel.status === "offline") {

                statusCell.innerText = "🔴";

            } else {

                statusCell.innerText = "⚫";

            }

        });

    } catch (error) {

        console.error(
            "Error actualizando estados:",
            error
        );

    }

}

setInterval(
    actualizarEstados,
    15000
);


async function agregarCanal() {

    const numero =
        document.getElementById("nuevoNumero").value.trim();

    const nombre =
        document.getElementById("nuevoNombre").value.trim();

    const url =
        document.getElementById("nuevoUrl").value.trim();

    const logo =
        document.getElementById("nuevoLogo").value.trim();

    const epgId =
        document.getElementById("nuevoEpg").value.trim();


    if (!numero || !nombre || !url) {

        alert(
            "Número, nombre y URL son obligatorios."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/channels?key=" + API_KEY,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({

                        numero: numero,

                        nombre: nombre,

                        url: url,

                        logo: logo,

                        epgId: epgId

                    })

                }
            );


        const data =
            await response.json();


        if (!data.ok) {

            alert(
                data.error ||
                "No se pudo agregar el canal."
            );

            return;

        }


        location.reload();


    } catch (error) {

        console.error(error);

        alert(
            "Error de conexión con el servidor."
        );

    }

}


async function actualizarCanal(id) {

    const numero =
        document.getElementById(
            "numero-" + id
        ).value.trim();


    const nombre =
        document.getElementById(
            "nombre-" + id
        ).value.trim();


    const url =
        document.getElementById(
            "url-" + id
        ).value.trim();


    const logo =
        document.getElementById(
            "logo-" + id
        ).value.trim();


    const epgId =
        document.getElementById(
            "epg-" + id
        ).value.trim();


    try {

        const response =
            await fetch(
                "/api/channels/" +
                id +
                "?key=" +
                API_KEY,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                        "application/json"
                    },

                    body: JSON.stringify({

                        numero: numero,

                        nombre: nombre,

                        url: url,

                        logo: logo,

                        epgId: epgId

                    })

                }
            );


        const data =
            await response.json();


        if (!data.ok) {

            alert(
                data.error ||
                "No se pudo actualizar el canal."
            );

            return;

        }


        location.reload();


    } catch (error) {

        console.error(error);

        alert(
            "Error de conexión con el servidor."
        );

    }

}


async function eliminarCanal(id) {

    if (
        !confirm(
            "¿Seguro que deseas eliminar este canal?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/channels/" +
                id +
                "?key=" +
                API_KEY,
                {

                    method: "DELETE"

                }
            );


        const data =
            await response.json();


        if (!data.ok) {

            alert(
                data.error ||
                "No se pudo eliminar el canal."
            );

            return;

        }


        location.reload();


    } catch (error) {

        console.error(error);

        alert(
            "Error de conexión con el servidor."
        );

    }

}

</script>

</body>

</html>

        `;


        res.send(html);


    } catch (error) {

        console.error(
            "❌ Error mostrando panel:",
            error
        );

        res.status(500).send(
            "Error interno del servidor"
        );

    }

});

// ===============================
// API DE CANALES
// ===============================

app.get("/api/channels", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "No autorizado"
        });
    }

    try {

        const channels =
            await channelsCollection
                .find({})
                .sort({ createdAt: 1 })
                .toArray();

        res.json({
            ok: true,
            channels
        });

    } catch (error) {

        console.error("❌ Error obteniendo canales:", error);

        res.status(500).json({
            ok: false,
            error: "Error obteniendo canales"
        });
    }

});

// ===============================
// API EXCLUSIVA PARA ANDROID TV
// ===============================

app.get("/api/app/channels", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "No autorizado"
        });
    }

    try {

        const channels =
            await channelsCollection
                .find({})
                .sort({ createdAt: 1 })
                .toArray();

        const appChannels = channels.map(channel => ({

            numero: channel.numero || "",
            nombre: channel.nombre || "",
            url: channel.url || "",
            logo: channel.logo || "",
            epgId: channel.epgId || ""

        }));

        res.json(appChannels);

    } catch (error) {

        console.error(
            "❌ Error obteniendo canales para Android TV:",
            error
        );

        res.status(500).json({
            ok: false,
            error: "Error obteniendo canales"
        });

    }

});


app.post("/api/channels", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "No autorizado"
        });
    }

    try {

        const {
            numero,
            nombre,
            url,
            logo,
            epgId
        } = req.body;

        if (!numero || !nombre || !url) {

            return res.status(400).json({
                ok: false,
                error: "numero, nombre y url son obligatorios"
            });

        }

        const nuevoCanal = {

            numero: String(numero),
            nombre: String(nombre),
            url: String(url),
            logo: logo ? String(logo) : "",
            epgId: epgId ? String(epgId) : "",
            status: "pending",
            createdAt: new Date()

        };

        const result =
            await channelsCollection.insertOne(
                nuevoCanal
            );

        res.json({
            ok: true,
            id: result.insertedId,
            channel: nuevoCanal
        });

    } catch (error) {

        console.error("❌ Error agregando canal:", error);

        res.status(500).json({
            ok: false,
            error: "Error agregando canal"
        });
    }

});


app.put("/api/channels/:id", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "No autorizado"
        });
    }

    try {

        const { ObjectId } = require("mongodb");

        const id = new ObjectId(req.params.id);

        const {
            numero,
            nombre,
            url,
            logo,
            epgId
        } = req.body;

        const updateData = {};

        if (numero !== undefined) {
            updateData.numero = String(numero);
        }

        if (nombre !== undefined) {
            updateData.nombre = String(nombre);
        }

        if (url !== undefined) {
            updateData.url = String(url);
            updateData.status = "pending";
        }

        if (logo !== undefined) {
            updateData.logo = String(logo);
        }

        if (epgId !== undefined) {
            updateData.epgId = String(epgId);
        }

        const result =
            await channelsCollection.updateOne(
                { _id: id },
                { $set: updateData }
            );

        if (result.matchedCount === 0) {

            return res.status(404).json({
                ok: false,
                error: "Canal no encontrado"
            });

        }

        res.json({
            ok: true
        });

    } catch (error) {

        console.error("❌ Error actualizando canal:", error);

        res.status(500).json({
            ok: false,
            error: "Error actualizando canal"
        });
    }

});


app.delete("/api/channels/:id", async (req, res) => {

    if (req.query.key !== API_KEY) {
        return res.status(401).json({
            ok: false,
            error: "No autorizado"
        });
    }

    try {

        const { ObjectId } = require("mongodb");

        const id = new ObjectId(req.params.id);

        const result =
            await channelsCollection.deleteOne({
                _id: id
            });

        if (result.deletedCount === 0) {

            return res.status(404).json({
                ok: false,
                error: "Canal no encontrado"
            });

        }

        res.json({
            ok: true
        });

    } catch (error) {

        console.error("❌ Error eliminando canal:", error);

        res.status(500).json({
            ok: false,
            error: "Error eliminando canal"
        });
    }

});

// ===============================
// VERIFICADOR AUTOMÁTICO M3U8
// ===============================

async function verificarCanal(url) {

    if (!url) {
        return false;
    }

    // Primera prueba: HEAD
    try {

        const response =
            await axios.head(
                url,
                {
                    timeout: 3000,

                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    },

                    validateStatus: status =>
                        status >= 200 && status < 400
                }
            );

        if (
            response.status >= 200 &&
            response.status < 400
        ) {
            return true;
        }

    } catch (error) {

        // Si HEAD falla, probamos GET
    }


    // Segunda prueba: GET
    try {

        const response =
            await axios.get(
                url,
                {
                    timeout: 5000,

                    responseType: "stream",

                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    },

                    validateStatus: status =>
                        status >= 200 && status < 400
                }
            );

        // Cerramos inmediatamente el stream.
        // Solo necesitamos comprobar que responde.
        if (response.data) {
            response.data.destroy();
        }

        return (
            response.status >= 200 &&
            response.status < 400
        );

    } catch (error) {

        return false;

    }

}


async function revisarTodosLosCanales() {

    if (!channelsCollection) {
        return;
    }

    try {

        const channels =
            await channelsCollection
                .find({})
                .toArray();


        if (channels.length === 0) {
            return;
        }


        console.log(
            `🔎 Verificando ${channels.length} canal(es)...`
        );


        for (const channel of channels) {

            const funciona =
                await verificarCanal(
                    channel.url
                );


            const nuevoStatus =
                funciona
                    ? "online"
                    : "offline";


            if (
                channel.status !== nuevoStatus
            ) {

                await channelsCollection.updateOne(

                    {
                        _id: channel._id
                    },

                    {
                        $set: {
                            status: nuevoStatus
                        }
                    }

                );


                console.log(
                    `${funciona ? "🟢" : "🔴"} ${channel.nombre} → ${nuevoStatus}`
                );

            }

        }


    } catch (error) {

        console.error(
            "❌ Error en el verificador:",
            error
        );

    }

}

async function iniciarServidor() {

    await conectarMongoDB();

    // Primera comprobación al iniciar el servidor
    await revisarTodosLosCanales();

    // Volver a comprobar cada 15 segundos
    setInterval(
        revisarTodosLosCanales,
        15000
    );

    app.listen(PORT, () => {

        console.log(
            `🚀 Bravo TV - Android TV Panel iniciado en el puerto ${PORT}`
        );

    });

}

iniciarServidor();