// Inicializar la base de datos Dexie
const db = new Dexie('IPC');

// Definir el esquema de la base de datos
db.version(1).stores({
    Users: 'UsuarioId, password',
    Semana: 'id, descripcion',
    Muestra: '[InformanteId+VariedadId+Semana], InformanteId, Semana, [InformanteId+Semana]',
    SeriesPrecios: '[InformanteId+VariedadId+Fecha], [InformanteId+VariedadId], [InformanteId+VariedadId+Semana], [InformanteId+Fecha], FechaCreacion',
    Variedades: '[id+informanteId], descripcion, informanteId',
    Informantes: '[CodInformante+Semana], CodInformante',
    DiasSemana: 'iDdia, dia, orden',
    UmedP: '[codproducto+urecol], urecol',
    InformanteDetalle: '[CodInformante+Semana]'
});

// Función para abrir la base de datos y realizar la configuración inicial si es necesario
async function IniciarBaseDatos() {
    try {
        await db.open();
        console.log('Base de datos abierta con éxito');

        // Verificar si los usuarios por defecto ya existen
        const adminUser = await db.Users.get('administrador');
        if (!adminUser) {
            await db.Users.bulkAdd([
                { UsuarioId: 'administrador', password: '9175E455384B20A983DDAB1408E35E3F3789B794' },
                { UsuarioId: 'Autoriza', password: '2FF731A2CCA6918F55903702391A2D1A1AF6CF51' }
            ]);
            console.log('Usuarios por defecto agregados.');
        }
        return db;
    } catch (error) {
        console.error('Error al abrir o inicializar la base de datos:', error);
        alert(`Tenemos un Error: ${error.name} / ${error.message}`);
        throw error;
    }
}

// No se necesita MostrarError con Dexie, ya que los errores se manejan con promesas.

// No se necesita CrearAlmacen explícitamente con Dexie, se define en db.version().stores().

async function validarLogin(usuarioId, password) {
    try {
        const user = await db.Users.get(usuarioId);
        if (!user) {
            return false;
        }
        const isValid = user.password === password;
        console.log('Coincidencia de Contraseña:', isValid);
        return isValid;
    } catch (error) {
        console.error('Error Validando Sesión:', error);
        return false;
    }
}

async function obtenerAlmacenarUsuarios(empleado) {
    try {
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipc/Connecter/${empleado}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const user = await response.json();
        console.log('Usuarios Obtenidos:', user);

        if (!user?.usuario) {
            throw new Error('Formato de Respuesta No Válido');
        }

        // Eliminar usuarios existentes excepto admin y Autoriza
        const existingUsers = await db.Users.toCollection().primaryKeys();
        const usersToDelete = existingUsers.filter(key => key !== 'admin' && key !== 'Autoriza');
        if (usersToDelete.length > 0) {
            await db.Users.bulkDelete(usersToDelete);
        }

        // Almacenar nuevo usuario
        await db.Users.put({
            UsuarioId: user.usuario,
            password: user.pass
        });

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        console.error('Error al Obtener y Almacenar Usuarios:', error);
        return { success: false, message: error.message };
    }
}


async function obtenerPermisoAlmacenar(empleado, usuario, clave) {
    try {
        let url = `https://appcepov.inide.gob.ni/endpoint/cipc/Einkommen/${empleado}/${usuario}`;
        if (clave) {
            url += `?clave=${encodeURIComponent(clave)}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const user = await response.json();
        console.log('Usuarios Obtenidos:', user);

        if (!user?.usuario) {
            throw new Error('Formato de Respuesta No Válido');
        }

        const existingUsers = await db.Users.toCollection().primaryKeys();
        const usersToDelete = existingUsers.filter(key => key !== 'admin' && key !== 'Autoriza');
        if (usersToDelete.length > 0) {
            await db.Users.bulkDelete(usersToDelete);
        }

        await db.Users.put({
            UsuarioId: user.usuario,
            password: user.pass
        });

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        console.error('Error al Obtener y Almacenar Usuarios:', error);
        return { success: false, message: error.message };
    }
}

async function obtenerAlmacenarCatalogos(empleado) {
    try {
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipc/Catalogos/${empleado}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();
        console.error(catalog);

        if (!catalog || !Array.isArray(catalog.informantes) || !Array.isArray(catalog.variedades) || !Array.isArray(catalog.diasSemana) || !Array.isArray(catalog.umedP) || !Array.isArray(catalog.semana) || !Array.isArray(catalog.informanteDto)) {
            throw new Error('Formato de respuesta inválido');
        }

        await db.transaction('rw', db.Informantes, db.Variedades, db.DiasSemana, db.UmedP, db.Semana, db.InformanteDetalle, async () => {
            await db.Informantes.bulkPut(catalog.informantes.map(inf => ({
                CodInformante: inf.codInformante.trim(),
                NombreInformante: inf.nombreInformante.trim(),
                Semana: Number.parseInt(inf.semana)
            })));

            await db.Variedades.bulkPut(catalog.variedades.map(variedad => ({
                id: variedad.id,
                Descripcion: variedad.descripcion,
                informanteId: variedad.informanteId.trim(),
            })));

            await db.DiasSemana.bulkPut(catalog.diasSemana.map(dias => ({
                iDdia: dias.iDdia.trim(),
                dia: dias.dia.trim(),
                orden: dias.orden.trim()
            })));

            await db.UmedP.bulkPut(catalog.umedP.map(umedp => ({
                codproducto: umedp.codproducto.trim(),
                urecol: umedp.urecol.trim()
            })));

            await db.Semana.bulkPut(catalog.semana.map(ssemana => ({
                id: ssemana.id,
                descripcion: ssemana.descripcion.trim()
            })));

            await db.InformanteDetalle.bulkPut(catalog.informanteDto.map(informante => ({
                CodInformante: informante.codInformante.trim(),
                Semana: Number.parseInt(informante.semana),
                Direccion: informante.direccion.trim(),
                Region: informante.nomRegionDistrito.trim(),
                Cantidad: Number.parseInt(informante.conteoProductos),
            })));
        });

        return {
            success: true,
            message: `Datos almacenados: ${catalog.informantes.length} informantes , ${catalog.variedades.length} variedades , ${catalog.diasSemana.length} dias ,  ${catalog.umedP.length} unidad medida y ${catalog.semana.length} semanas`
        };

    } catch (error) {
        console.error('Error al Obtener y Almacenar Datos:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

async function obtenerAlmacenarMuestra(empleado) {
    try {
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipc/MuestraLinq/${empleado}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog)) {
            throw new Error('Formato de respuesta inválido');
        }

        await db.Muestra.bulkPut(catalog.map(muestra => ({
            InformanteId: muestra.informanteId.trim(),
            VariedadId: muestra.variedadId.trim(),
            Fecha: muestra.fecha,
            Descripcion: muestra.descripcion,
            Especificacion: muestra.especificacion,
            Detalle: muestra.detalle,
            muestraid: muestra.muestraid,
            Semana: muestra.semana,
            DiaSemanaId: muestra.diaSemanaId,
            Nveces: muestra.nveces,
            EsPesable: muestra.esPesable,
            PrecioRecolectadoAnt: muestra.precioRecolectadoAnt,
            CantidadAnt: muestra.cantidadAnt,
            UnidadMedidaId: muestra.unidadMedidaId,
            ObservacionAnalista: muestra.observacionAnalista,
        })));

        return {
            success: true,
            message: `Datos almacenados: ${catalog.length} muestra`
        };

    } catch (error) {
        console.error('Error al Obtener y Almacenar Datos:', error);
        return {
            success: false,
            message: error.message
        };
    }
}


// No es necesario guardarUsuariohashEnBaseDatos con Dexie de esta forma, se maneja en la definición del esquema y la función validarLogin.

// Función para obtener el valor de una cookie por su nombre (sin cambios)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// mostrarMensaje (sin cambios)
function mostrarMensaje(mensaje, tipo = 'success') {
    const messageDiv = document.getElementById('message');

    if (!messageDiv) {
        console.warn('No se encontró el contenedor de mensajes');
        return;
    }

    messageDiv.className = 'alert alert-dismissible fade show d-none';

    if (tipo === 'success') {
        messageDiv.classList.remove('d-none', 'alert-danger','alert-warning','alert-info');
        messageDiv.classList.add('alert-success');
    } else if (tipo === 'error') {
        messageDiv.classList.remove('d-none', 'alert-success','alert-warning','alert-info');
        messageDiv.classList.add('alert-danger');
    } else if (tipo === 'warning') {
        messageDiv.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
        messageDiv.classList.add('alert-warning');
    } else if (tipo === 'info') {
        messageDiv.classList.remove('d-none', 'alert-success', 'alert-danger','alert-warning');
        messageDiv.classList.add('alert-info');
    }

    messageDiv.textContent = mensaje;

    setTimeout(() => {
        messageDiv.classList.add('d-none');
        messageDiv.textContent = '';
    }, 2000);
}

async function validarRegistrosMuestraEnSeriesPrecios() {
    try {
        const registrosMuestra = await db.Muestra.toArray();

        if (registrosMuestra.length === 0) {
            mostrarMensaje('No hay registros en la tabla Muestra.', 'error');
            return;
        }

        let faltanRegistros = false;
        for (const registroMuestra of registrosMuestra) {
            const { InformanteId, VariedadId, Fecha } = registroMuestra;
            const series = await db.SeriesPrecios
                .where({ InformanteId: InformanteId, VariedadId: VariedadId, Fecha: Fecha, Enviado: true })
                .count();
            if (series === 0) {
                faltanRegistros = true;
                break;
            }
        }

        if (faltanRegistros) {
            mostrarMensaje('Faltan registros por ingresar de la muestra o no están marcados como enviados', 'error');
        } else {
            mostrarMensaje('Se completó el proceso de ingreso de la muestra', 'success');
            LimpiarBase(); // Asumiendo que LimpiarBase también se refactorizará
        }
    } catch (error) {
        console.error("Error al validar registros:", error);
        mostrarMensaje('Error al validar registros.', 'error');
    }
}


// Función para hashear una cadena usando SHA-1 (sin cambios)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function deleteStore() {
    try {
        await Dexie.delete('IPC');
        console.log("Base de datos eliminada con éxito");
        // Volver a inicializar la base de datos después de eliminarla para recrear las tablas y datos iniciales.
        await IniciarBaseDatos();
        return {
            success: true,
            message: "Base de datos eliminada y reiniciada con éxito"
        };
    } catch (error) {
        console.error("Error al eliminar la base de datos:", error);
        // Intentar reabrir la base de datos incluso si la eliminación falló (podría estar bloqueada)
        try {
            await IniciarBaseDatos();
        } catch (reopenError) {
            console.error("Error al reabrir la base de datos después del fallo de eliminación:", reopenError);
        }
        return {
            success: false,
            message: `Error al eliminar la base de datos: ${error.message}`
        };
    }
}

// Función para eliminar una cookie (sin cambios)
function deleteCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// deleteStore1 y CrearAlmacen2 no son necesarios con Dexie.
