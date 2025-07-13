let bd;

async function IniciarBaseDatos() {
    return new Promise((resolve, reject) => {
        // Abrir la base de datos
        const solicitud = indexedDB.open('IPC', 2); // El segundo parámetro es la versión de la base de datos

        solicitud.addEventListener('error', (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject(event.target.error);
        });

        solicitud.addEventListener('success', (event) => {
            bd = event.target.result; // Guardar la referencia a la base de datos
            console.log('Base de datos abierta con éxito');
            resolve(bd); // Devolver la base de datos
        });

        solicitud.addEventListener('upgradeneeded', (event) => {
            bd = event.target.result; // Guardar la referencia a la base de datos
            console.log('Base de datos necesita ser creada o actualizada');
            CrearAlmacen(event); // Llama a CrearAlmacen con el evento
        });
    });
}

function MostrarError(evento) {
    const error = evento.target.error;
    console.error('Error al abrir la base de datos:', evento.target.error);
    alert(`Tenemos un Error: ${error.code} / ${error.message}`);
}

function CrearAlmacen(evento) {
  const db = evento.target.result; // Obtener la base de datos

  // Crear el objeto de almacenamiento para 'Users'
  if (!db.objectStoreNames.contains('Users')) {
      const usersStore = db.createObjectStore('Users', { keyPath: 'UsuarioId' });
      usersStore.createIndex('UsuarioId', 'UsuarioId', { unique: true });     
      
      usersStore.transaction.oncomplete = () => {
            const transaction = db.transaction(['Users'], 'readwrite');
            const store = transaction.objectStore('Users');
    
            // Agregar el usuario admin con una contraseña por defecto
            store.add({ UsuarioId: 'administrador', password: '9175E455384B20A983DDAB1408E35E3F3789B794' }); 
            store.add({ UsuarioId: 'Autoriza', password: '2FF731A2CCA6918F55903702391A2D1A1AF6CF51' });
      }
  }

  // Crear el objeto de almacenamiento para 'Semana'
  if (!db.objectStoreNames.contains('Semana')) {
    const semanaStore = db.createObjectStore('Semana', { keyPath: 'id' });
    semanaStore.createIndex('id', 'id', { unique: true });
  }  

    // Crear el objeto de almacenamiento para 'Muestra'
    if (!db.objectStoreNames.contains('Muestra')) {
        const almacenMuestra = db.createObjectStore('Muestra', { 
            keyPath: ['InformanteId', 'VariedadId', 'Semana', 'DiaSemanaId'] 
            });
        almacenMuestra.createIndex('BuscarxInfSemDia', ['InformanteId', 'Semana', 'DiaSemanaId'], { unique: false });
    }

    // Crear el objeto de almacenamiento para 'SeriePrecio'
    if (!db.objectStoreNames.contains('SeriesPrecios')) {
        const almacenSeriePrecio = db.createObjectStore('SeriesPrecios', { 
            keyPath: ['InformanteId', 'VariedadId', 'Semana', 'Dia', 'Fecha'] 
            });
        almacenSeriePrecio.createIndex('BuscarxInfVarSem', ['InformanteId', 'VariedadId', 'Semana'], { unique: false });
        almacenSeriePrecio.createIndex('BuscarxInfSemDia', ['InformanteId', 'Semana', 'Dia'], { unique: false });
        almacenSeriePrecio.createIndex('BuscarPorFechaCreacion', 'FechaCreacion');
    }  

    if (!db.objectStoreNames.contains('Variedades')) {
        const almacenVariedades = db.createObjectStore('Variedades', { 
            keyPath: ['id', 'informanteId', 'Semana', 'Dia'] // ✅ Clave compuesta
        });
        almacenVariedades.createIndex('BuscarInfSemDia', ['informanteId','Semana', 'Dia'], { unique: false });
    }

    // Crear el objeto de almacenamiento para 'Informantes'
    if (!db.objectStoreNames.contains('Informantes')) {
        const almacenInformantes = db.createObjectStore('Informantes',  { keyPath: ['CodInformante', 'Semana', 'Dia']} );
        almacenInformantes.createIndex('BuscarSemDia', ['Semana', 'Dia'], { unique: false });
    }

    // Crear el objeto de almacenamiento para 'DiasSemana'
    if (!db.objectStoreNames.contains('DiasSemana')) {
        const almacenDiasSemana = db.createObjectStore('DiasSemana', { keyPath: 'iDdia' });
    }

    if (!db.objectStoreNames.contains('UmedP')) {
        const almacenUmedp = db.createObjectStore('UmedP', { 
            keyPath: ['codproducto', 'urecol'] // ✅ Clave compuesta
        });
    }   
    
    if (!db.objectStoreNames.contains('InformanteDetalle')) {
        const almacenInformanteDetalle = db.createObjectStore('InformanteDetalle', { 
            keyPath: ['CodInformante', 'Semana', 'Dia'] // ✅ Clave compuesta
        });
        almacenInformanteDetalle.createIndex('BuscaxInformante', 'CodInformante', { unique: false });
    }
}

async function validarLogin(usuarioId, password) {
  try {
      const db = await IniciarBaseDatos(); // Asegúrate de que esta función devuelva la base de datos
      const tx = db.transaction('Users', 'readonly');
      const store = tx.objectStore('Users');
      
      // Obtener el usuario por su ID
      const userRequest = store.get(usuarioId);
      
      // Esperar a que la solicitud se complete
      const user = await new Promise((resolve, reject) => {
          userRequest.onsuccess = () => resolve(userRequest.result);
          userRequest.onerror = () => reject(userRequest.error);
      });      
      
      if (!user) {
          return false;
      }

      // Comparar contraseñas directamente, ya que están almacenadas como texto plano
      const isValid = user.password === password;
      return isValid;
  } catch (error) {
      return false;
  }
}

async function obtenerAlmacenarUsuarios(empleado) {
    try {  // https://localhost:7062  https://appcepov.inide.gob.ni
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipc/Connecter/${empleado}`, {        
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

         // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const user = await response.json();
       
        // Verificar que la respuesta sea un array
        if (!user?.usuario) {
            throw new Error('Formato de Respuesta No Válido');
        }
        // if (!Array.isArray(users)) {
        //     throw new Error('Formato de Respuesta No Válido');
        // }

        // Inicializar la base de datos
        const db = await IniciarBaseDatos();
        const tx = db.transaction('Users', 'readwrite');
        const store = tx.objectStore('Users');

        // Eliminar usuarios existentes excepto admin y Autoriza
        const existingUsers = await new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        for (const key of existingUsers) {
            if (key !== 'administrador' && key !== 'Autoriza') {
                await store.delete(key);
            }
        }

        // Almacenar nuevos usuarios
        await store.put({
            UsuarioId: user.usuario,
            password: user.pass // Puedes cambiar la clave según sea necesario
        });
        
        await tx.done; // Asegúrate de que la transacción se complete

        // Cerrar la conexión a la base de datos
        db.close();

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function obtenerPermisoAlmacenar(empleado, usuario, clave) {
    try {
        // Construir la URL base 
        let url = `https://appcepov.inide.gob.ni/endpoint/cipc/Einkommen/${empleado}/${usuario}`;

        // Agregar clave a la URL
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
            // Capturar el mensaje de error del cuerpo de la respuesta
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const user = await response.json();
       
        if (!user?.usuario) {
            throw new Error('Formato de Respuesta No Válido');
        }

        const db = await IniciarBaseDatos();
        const tx = db.transaction('Users', 'readwrite');
        const store = tx.objectStore('Users');

        // Eliminar usuarios existentes excepto admin
        const existingUsers = await new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        for (const key of existingUsers) {
            if (key !== 'administrador' && key !== 'Autoriza') {
                await store.delete(key);
            }
        }

        // Almacenar el nuevo usuario
        await store.put({
             UsuarioId: user.usuario,
            password: user.pass
        });

        await tx.done; // Asegúrate de que la transacción se complete

        // Cerrar la conexión a la base de datos
        db.close();

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function obtenerAlmacenarCatalogos(empleado) {
    try {
        // Obtener datos desde la API https://localhost:7062 
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

        if (!catalog || !Array.isArray(catalog.informantes) || !Array.isArray(catalog.variedades) || !Array.isArray(catalog.diasSemana) || !Array.isArray(catalog.umedP) || !Array.isArray(catalog.semana) || !Array.isArray(catalog.informanteDto)) {
            throw new Error('Formato de respuesta inválido');
        }

        // Iniciar la base de datos
        const db = await IniciarBaseDatos();

        // Insertar informantes
        const txInformantes = db.transaction('Informantes', 'readwrite');
        const informantesStore = txInformantes.objectStore('Informantes');
        
        for (const informante of catalog.informantes) {
            await informantesStore.put({
                CodInformante: informante.codInformante.trim(),
                NombreInformante: informante.nombreInformante.trim(),
                Semana: Number.parseInt(informante.semana),
                Dia: informante.dia.trim(),
            });
        }
        await txInformantes.done;

        // Insertar variedades
        const txVariedades = db.transaction('Variedades', 'readwrite');
        const variedadesStore = txVariedades.objectStore('Variedades');
        
        for (const variedad of catalog.variedades) {
            await variedadesStore.put({
                id: variedad.id,
                Descripcion: variedad.descripcion,
                informanteId : variedad.informanteId.trim(),
                Semana: Number.parseInt(variedad.semana),
                Dia: variedad.dia.trim(),
            });
        }
        await txVariedades.done;

        //Insertar dias
        const txDias = db.transaction('DiasSemana', 'readwrite');
        const diasStore = txDias.objectStore('DiasSemana');
        
        for (const dias of catalog.diasSemana) {
            await diasStore.put({
                iDdia: dias.iDdia.trim(),
                dia: dias.dia.trim(),
                orden: dias.orden.trim()
            });
        }
        await txDias.done;

        //Insertar umedp
        const txUmedP = db.transaction('UmedP', 'readwrite');
        const umedpStore = txUmedP.objectStore('UmedP');
        
        for (const umedp of catalog.umedP) {
            await umedpStore.put({
                codproducto: umedp.codproducto.trim(),
                urecol: umedp.urecol.trim()
            });
        }
        await txUmedP.done;

        //Insertar Semana
        const txSemana = db.transaction('Semana', 'readwrite');
        const semanaStore = txSemana.objectStore('Semana');
        
        for (const ssemana of catalog.semana) {
            await semanaStore.put({
                id: ssemana.id,
                descripcion: ssemana.descripcion.trim()
            });
        }
        await txSemana.done;

        // Insertar InformanteDetalle
        const txInformantesDetalle = db.transaction('InformanteDetalle', 'readwrite');
        const informantesDetalleStore = txInformantesDetalle.objectStore('InformanteDetalle');
        
        for (const informante of catalog.informanteDto) {
            await informantesDetalleStore.put({
                CodInformante: informante.codInformante.trim(),
                Semana: Number.parseInt(informante.semana),
                Direccion: informante.direccion.trim(),
                Barrio: informante.barrio.trim(),
                Region: informante.nomRegionDistrito.trim(),
                Cantidad: Number.parseInt(informante.conteoProductos),
                Dia: informante.dia.trim(),
            });
        }
        await txInformantesDetalle.done;

        // Cerrar la conexión a la base de datos
        db.close();

        return { 
            success: true, 
            message: `Datos almacenados: ${catalog.informantes.length} informantes , ${catalog.variedades.length} variedades , ${catalog.diasSemana.length} dias ,  ${catalog.umedP.length} unidad medida y ${catalog.semana.length} semanas`
        }; 

    } catch (error) {
        return { 
            success: false, 
            message: error.message 
        };
    }
}

async function obtenerAlmacenarMuestra(empleado) {
    try {
        // Obtener datos desde la API  https://localhost:7062 https://appcepov.inide.gob.ni
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

        // Iniciar la base de datos
        const db = await IniciarBaseDatos();

        // Insertar informantes
        const txMuestras = db.transaction('Muestra', 'readwrite');
        const muestraStore = txMuestras.objectStore('Muestra');
        for (const muestra of catalog) {
            await muestraStore.put({
                InformanteId: muestra.informanteId.trim(),
                VariedadId: muestra.variedadId.trim(),
                Fecha: muestra.fecha,
                Descripcion : muestra.descripcion,
                Especificacion : muestra.especificacion,
                Detalle : muestra.detalle,
                muestraid : muestra.muestraid,
                Semana : muestra.semana,
                DiaSemanaId : muestra.diaSemanaId,
                Nveces : muestra.nveces,
                EsPesable : muestra.esPesable,
                PrecioRecolectadoAnt: muestra.precioRecolectadoAnt,
                CantidadAnt : muestra.cantidadAnt,
                UnidadMedidaId : muestra.unidadMedidaId,
                ObservacionAnalista : muestra.observacionAnalista,
                MonedaId : muestra.monedaId,
                PesoAnt : muestra.pesoAnt,
            });
        }
        await txMuestras.done;

        // Cerrar la conexión a la base de datos
        db.close();

        return { 
            success: true, 
            message: `Datos almacenados: ${catalog.length} muestra` 
        };

    } catch (error) {
        return { 
            success: false, 
            message: error.message 
        };
    }
}

function mostrarMensaje(mensaje, tipo = 'success') {
    const messageDiv = document.getElementById('message');

    if (!messageDiv) {
        console.warn('No se encontró el contenedor de mensajes');
        return;
    }

    // Limpiar clases anteriores
    messageDiv.className = 'alert alert-dismissible fade show d-none'; 

    // Determinar el tipo de mensaje
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

    // Mostrar el mensaje
    messageDiv.textContent = mensaje;

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
        messageDiv.classList.add('d-none');
        messageDiv.textContent = ''; // Limpiar el texto
    }, 2000);
}

// Función para hashear una cadena usando SHA-1
async function hashPassword(password) {
    // Convertir la contraseña a un Uint8Array (formato binario)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Generar el hash usando SHA-1
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);

    // Convertir el hash a una representación hexadecimal
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

    return hashHex; // Devolver el hash en formato hexadecimal
}

// function eleminar store
async function deleteStore() {
    return new Promise((resolve, reject) => {
        const dbName = "IPC"; // Asegúrate del nombre correcto

        // 1. Cerrar todas las conexiones activas
        const openRequest = indexedDB.open(dbName);
        
        // Escuchar si hay conexiones remotas que deban cerrarse
        openRequest.onblocked = (event) => {
            console.warn("La eliminación está bloqueada. Otra pestaña o ventana sigue usando la base de datos.");
            reject({
                success: false,
                message: "La base de datos está siendo usada en otra pestaña. Cierra todas las ventanas del sistema e intenta nuevamente."
            });
        };

        openRequest.onsuccess = (event) => {
            const db = event.target.result;

            // Escuchar si otra conexión intenta mantener la base abierta
            db.onversionchange = (event) => {
                console.log("Otra pestaña está usando la base de datos. Forzando cierre...");
                db.close(); // Cerrar esta conexión para permitir eliminación
            };

            // Cerrar conexión local
            db.close();
            console.log("Conexión local cerrada. Procediendo a eliminar...");

            // 2. Eliminar base de datos
            const deleteRequest = indexedDB.deleteDatabase(dbName);

            deleteRequest.onsuccess = (event) => {
                console.log("Base de datos eliminada con éxito");
                resolve({
                    success: true,
                    message: "Base de datos eliminada con éxito"
                });
            };

            deleteRequest.onerror = (event) => {
                console.error("Error al eliminar la base de datos:", event.target.error);
                reject({
                    success: false,
                    message: `Error al eliminar la base de datos: ${event.target.error.message}`
                });
            };

            deleteRequest.onblocked = (event) => {
                console.warn("Eliminación bloqueada - base de datos en uso", event);
                reject({
                    success: false,
                    message: "No se pudo eliminar porque la base de datos sigue abierta en otra pestaña."
                });
            };
        };

        openRequest.onerror = (event) => {
            // Si no se puede abrir la base de datos (porque no existe o hay errores)
            if (event.target.error.name === "InvalidStateError") {
                console.warn("La base de datos ya fue eliminada o no existe");
                resolve({
                    success: true,
                    message: "La base de datos ya no existe o fue eliminada anteriormente."
                });
                return;
            }

            console.error("Error al abrir la base de datos para cierre forzado:", event.target.error);
            reject({
                success: false,
                message: `Error al abrir la base de datos: ${event.target.error.message}`
            });
        };        
    });
}



async function guardarUsuariohashEnBaseDatos(usuarioId, password) {
    try {
        // Hashear la contraseña antes de almacenarla
        const hashedPassword = await hashPassword(password);

        // Abrir la base de datos IndexedDB
        const request = indexedDB.open("MiBaseDeDatos", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("usuarios")) {
                db.createObjectStore("usuarios", { keyPath: "usuarioId" });
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("usuarios", "readwrite");
            const store = transaction.objectStore("usuarios");

            // Guardar el usuario con la contraseña hasheada
            store.put({ usuarioId, password: hashedPassword });

            transaction.oncomplete = () => {
                console.log("Usuario guardado correctamente.");
            };
        };

        request.onerror = (event) => {
            console.error("Error al abrir la base de datos:", event.target.error);
        };
    } catch (error) {
        console.error("Error al hashear o guardar la contraseña:", error);
    }
}

function CrearAlmacen2(evento) {
  const db = evento.target.result; // Obtener la base de datos

  // Crear el objeto de almacenamiento para 'Users'
  if (!db.objectStoreNames.contains('Users')) {
      const usersStore = db.createObjectStore('Users', { keyPath: 'UsuarioId' });
      usersStore.createIndex('UsuarioId', 'UsuarioId', { unique: true });     
      
      usersStore.transaction.oncomplete = () => {
            const transaction = db.transaction(['Users'], 'readwrite');
            const store = transaction.objectStore('Users');
    
            // Agregar el usuario admin con una contraseña por defecto
            store.add({ UsuarioId: 'administrador', password: '9175E455384B20A983DDAB1408E35E3F3789B794' }); 
            store.add({ UsuarioId: 'Autoriza', password: '2FF731A2CCA6918F55903702391A2D1A1AF6CF51' });
      }
  }

  // Crear el objeto de almacenamiento para 'Semana'
  if (!db.objectStoreNames.contains('Semana')) {
    const semanaStore = db.createObjectStore('Semana', { keyPath: 'id' });
    semanaStore.createIndex('id', 'id', { unique: true });
  }  

    // Crear el objeto de almacenamiento para 'Muestra'
    if (!db.objectStoreNames.contains('Muestra')) {
        const almacenMuestra = db.createObjectStore('Muestra', { 
            keyPath: ['InformanteId', 'VariedadId', 'Semana', 'DiaSemanaId'] 
            });
        //almacenMuestra.createIndex('BuscarxInformante', 'InformanteId', { unique: false }); 
        //almacenMuestra.createIndex('BuscarxInformanteYSemana', ['InformanteId', 'Semana'], { unique: false });
        almacenMuestra.createIndex('BuscarxInfSemDia', ['InformanteId', 'Semana', 'DiaSemanaId'], { unique: false });
    }

    // Crear el objeto de almacenamiento para 'SeriePrecio'
    if (!db.objectStoreNames.contains('SeriesPrecios')) {
        const almacenSeriePrecio = db.createObjectStore('SeriesPrecios', { 
            keyPath: ['InformanteId', 'VariedadId', 'Fecha'] 
            });
        //almacenSeriePrecio.createIndex('BuscarPorInformanteYVariedad', ['InformanteId', 'VariedadId'], { unique: false });
        almacenSeriePrecio.createIndex('BuscarxInfVarSem', ['InformanteId', 'VariedadId', 'Semana'], { unique: false });
        //almacenSeriePrecio.createIndex('BuscarxInfVarSemDia', ['InformanteId', 'VariedadId', 'Semana', 'Dia'], { unique: false });
        //almacenSeriePrecio.createIndex('BuscarxInfSem', ['InformanteId', 'Semana'], { unique: false });
        almacenSeriePrecio.createIndex('BuscarxInfSemDia', ['InformanteId', 'Semana', 'Dia'], { unique: false });
        //almacenSeriePrecio.createIndex('BuscarPorInformanteYFecha', ['InformanteId', 'Fecha'], { unique: false });
        almacenSeriePrecio.createIndex('BuscarPorFechaCreacion', 'FechaCreacion');
    }  

    if (!db.objectStoreNames.contains('Variedades')) {
        const almacenVariedades = db.createObjectStore('Variedades', { 
            keyPath: ['id', 'informanteId', 'Semana', 'Dia'] // ✅ Clave compuesta
            //idUnico: `${variedad.id}-${variedad.informanteId.trim()}`,
            //keyPath: 'idUnico'
        });
       // almacenVariedades.createIndex('BuscarVarSemDia', ['id','Semana', 'Dia'], { unique: false });
        almacenVariedades.createIndex('BuscarInfSemDia', ['informanteId','Semana', 'Dia'], { unique: false });
        //almacenVariedades.createIndex('BuscarDescripcion', 'descripcion', { unique: false });
        //almacenVariedades.createIndex('BuscarInformante', 'informanteId', { unique: false });
    }

    // Crear el objeto de almacenamiento para 'Informantes'
    if (!db.objectStoreNames.contains('Informantes')) {
        const almacenInformantes = db.createObjectStore('Informantes',  { keyPath: ['CodInformante', 'Semana', 'Dia']} );
        //almacenInformantes.createIndex('BuscarInformante', 'CodInformante', { unique: false }); 
        almacenInformantes.createIndex('BuscarSemDia', ['Semana', 'Dia'], { unique: false });
    }

    // Crear el objeto de almacenamiento para 'DiasSemana'
    if (!db.objectStoreNames.contains('DiasSemana')) {
        const almacenDiasSemana = db.createObjectStore('DiasSemana', { keyPath: 'iDdia' });
        almacenDiasSemana.createIndex('BuscarDia', 'iDdia', { unique: false }); 
    }

    if (!db.objectStoreNames.contains('UmedP')) {
        const almacenUmedp = db.createObjectStore('UmedP', { 
            keyPath: ['codproducto', 'urecol'] // ✅ Clave compuesta
        });
        almacenUmedp.createIndex('Buscarurecol', 'urecol', { unique: false });
    }   
    
    if (!db.objectStoreNames.contains('InformanteDetalle')) {
        const almacenInformanteDetalle = db.createObjectStore('InformanteDetalle', { 
            keyPath: ['CodInformante', 'Semana', 'Dia'] // ✅ Clave compuesta
            //idUnico: `${variedad.id}-${variedad.informanteId.trim()}`,
            //keyPath: 'idUnico'
        });
        almacenInformanteDetalle.createIndex('BuscaxInformante', 'CodInformante', { unique: false });
    }
}

// Función para agregar un usuario
async function agregarUsuario(usuarioId, password) {
    const db = await IniciarBaseDatos();
    const transaction = db.transaction(['Users'], 'readwrite');
    const store = transaction.objectStore('Users');
    const usuario = { UsuarioId: usuarioId, password: password };
    return new Promise((resolve, reject) => {
        const request = store.add(usuario);
        request.onsuccess = () => {
            resolve();
            return { success: true, message: 'Usuario creado correctamente.' };
        };
        request.onerror = (event) => {
            reject('Error al agregar el usuario:', event.target.error);
            return { success: false, message: event.target.error };
        };
    });
}

async function obtenerConnecter(empleado) {
    try { 
            const url = 'https://localhost:7062/endpoint/cuentas/Connecter?utilisatrice=Administrador&passe=A5CD3BCFC12643684DA33DE721DDEA2AEDF0FDB6';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVVElMSVNBVFJJQ0UiOiJBZG1pbmlzdHJhZG9yIiwiZXhwIjoxNzUwMzk4MDMxfQ.TPO2pktexM9gyLJk5QEL3JmLYvAC7yIhuFjeZh-oFUk'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const user = await response.json();
        console.error(user)

        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        console.error('Error al Obtener y Almacenar Usuarios:', error);
        return { success: false, message: error.message };
    }
    

    // .then(response => {
       
    //     if (!response.ok) {
    //          console.error(response)
    //         throw new Error(`HTTP error! status: ${response.status}`);
    //     }
    //     return response.json(); // o response.text() si esperas texto plano, o response.blob(), etc.
    // })
    // .then(data => {
    //     console.error(data)
    //     console.log('Respuesta:', data);
    //     return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    // })
    // .catch(error => {
    //     console.error('Error:', error);
    // });
}

async function obtenerPermisoAlmacenar2(empleado, usuario, clave) {
    try {
        // Construir la URL base
        let url = `https://appcepov.inide.gob.ni/endpoint/cipc/Einkommen/${empleado}/${usuario}`;

        // Agregar clave a la URL si está presente
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

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
        }

        const users = await response.json();
        console.log('Usuarios Obtenidos:', users);
       
        // Verificar que la respuesta sea un array
        if (!Array.isArray(users)) {
            throw new Error('Formato de Respuesta No Válido');
        }

        // Inicializar la base de datos
        const db = await IniciarBaseDatos();
        const tx = db.transaction('Users', 'readwrite');
        const store = tx.objectStore('Users');

        // Eliminar usuarios existentes excepto admin y Autoriza
        const existingUsers = await new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        for (const key of existingUsers) {
            if (key !== 'admin' && key !== 'Autoriza') {
                await store.delete(key);
            }
        }

        // Almacenar nuevos usuarios
        for (const user of users) {
            if (user.usuario && user.pass) {
                await store.put({
                    UsuarioId: user.usuario,
                    password: user.pass
                });
            } else {
                console.warn('Usuario o contraseña faltante en el objeto:', user);
            }
        }

        await tx.done; // Asegúrate de que la transacción se complete
        return { success: true, message: 'Usuarios importados y almacenados correctamente.' };
    } catch (error) {
        console.error('Error al Obtener y Almacenar Usuarios:', error);
        return { success: false, message: error.message };
    }
}

// async function validarRegistrosMuestraEnSeriesPrecios() {
//   try {
//     const db = await IniciarBaseDatos();
//     const transactionMuestra = db.transaction(['Muestra'], 'readonly');
//     const almacenMuestra = transactionMuestra.objectStore('Muestra');
//     const registrosMuestra = await new Promise((resolve, reject) => {
//       const getAllMuestraRequest = almacenMuestra.getAll();
//       getAllMuestraRequest.onsuccess = event => resolve(event.target.result);
//       getAllMuestraRequest.onerror = event => reject(event.target.error);
//     });

//     if (registrosMuestra.length === 0) {
//       mostrarMensaje('No hay registros en la tabla Muestra.', 'error');
//       return;
//     }

//     const transactionSeriePrecio = db.transaction(['SeriesPrecios'], 'readonly');
//     const almacenSeriePrecio = transactionSeriePrecio.objectStore('SeriesPrecios');

//     let registrosCompletados = 0;
//     let faltanRegistros = false;

//     for (const registroMuestra of registrosMuestra) {
//       const { InformanteId, VariedadId, Fecha } = registroMuestra;
//       const index = almacenSeriePrecio.index('BuscarPorInformanteYVariedad');
//       const resultados = await new Promise((resolve, reject) => {
//         const request = index.getAll([InformanteId, VariedadId]);
//         request.onsuccess = event => resolve(event.target.result);
//         request.onerror = event => reject(event.target.error);
//       });

//       // Filtrar por Fecha y que Enviado sea true
//         const encontrado = resultados.some(registro => 
//           registro.Fecha === Fecha && registro.Enviado === true
//         );

//       if (encontrado) {
//         registrosCompletados++;
//       } else {
//         faltanRegistros = true;
//         break;
//       }
//     }    

//     if (faltanRegistros) {
//       mostrarMensaje('Faltan registros por ingresar de la muestra o no están marcados como enviados', 'error');
//     } else {
//       mostrarMensaje('Se completó el proceso de ingreso de la muestra', 'success');
//       LimpiarBase();
//     }
//   } catch (error) {
//     console.error("Error al validar registros:", error);
//     mostrarMensaje('Error al validar registros.', 'error');
//   }
// }

// Función para obtener el valor de una cookie por su nombre

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}   

// Función para eliminar una cookie
function deleteCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}  

async function deleteStore1() {
    return new Promise((resolve, reject) => {
        // Asegúrate de usar el nombre correcto de la base de datos
        const deleteRequest = indexedDB.deleteDatabase("IPC"); // ⚠️ Cambia si es "IPC"

        deleteRequest.onsuccess = (event) => {
            resolve({ 
                success: true, 
                message: "Base de Datos Eliminada" 
            });
        };

        deleteRequest.onerror = (event) => {
            console.error("Error al eliminar la base de datos:", event.target.error);
            reject({ 
                success: false, 
                message: `Error al eliminar la base de datos: ${event.target.error.message}` 
            });
        };

        deleteRequest.onblocked = (event) => {
            console.warn("La eliminación de la base de datos está bloqueada");
            reject({ 
                success: false, 
                message: "La eliminación está bloqueada (la base de datos sigue abierta en otra ventana/pestaña)" 
            });
        };
    });
}

function CrearAlmacen2(evento) {
    let almacen = bd.createObjectStore('Contactos', { keyPath: 'id', autoIncrement: true });
    almacen.createIndex('BuscarNombre', 'nombre', {unique: false});

    almacen = bd.createObjectStore('Editorial', { keyPath: 'id', autoIncrement: true });
    almacen.createIndex('BuscarEditorial', 'editorial', {unique: false});
}
