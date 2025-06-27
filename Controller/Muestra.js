async function cargarSelect(storeName, selectElement, keyField, displayField, sortField, filterField = null, filterValue = null) {
    try {
        const db = await IniciarBaseDatos();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        // ✅ Usar índice si existe, pero abrir cursor directamente
        const index = filterField && store.indexNames.contains(filterField)
            ? store.index(filterField)
            : store;

        const cursorRequest = index.openCursor();

        const items = [];
        
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            
            if (cursor) {
                const item = cursor.value;

                // ✅ Limpiar valores para evitar fallos por espacios
                const valorFiltro = filterValue?.trim();
                const valorItem = item[filterField]?.trim();

                // ✅ Aplicar filtro manual si hay campo y valor definidos
                if (!filterField || valorItem === valorFiltro) {
                    items.push(item);
                }

                cursor.continue();
            } else {
                // ✅ Ordenar resultados
                items.sort((a, b) => {
                    const valA = a[sortField]?.trim().toLowerCase() || '';
                    const valB = b[sortField]?.trim().toLowerCase() || '';
                    return valA.localeCompare(valB);
                });                

                // ✅ Renderizar opciones
                selectElement.innerHTML = '';
                if (items.length > 0) {
                    for (const item of items) {
                        const option = document.createElement('option');
                        option.value = item[keyField];
                        option.textContent = item[displayField];
                        selectElement.appendChild(option);
                        selectElement.selectedIndex = -1;
                    }
                } else {
                    selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
                }

                // ✅ Actualizar Select2 si está activo
                $(selectElement).trigger('change');
            }
        };

        cursorRequest.onerror = (event) => {
            console.error("Error al abrir cursor:", event.target.error);
            selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
            $(selectElement).trigger('change');
        };

    } catch (error) {
        console.error(`Error al cargar ${storeName}:`, error);
        selectElement.innerHTML = '<option value="">Error de conexión</option>';
        $(selectElement).trigger('change');
    }
}

// Función para filtrar muestras
async function filtrarMuestras(informanteId, variedadId, semanaId) {
    try {
        const db = await IniciarBaseDatos();
        const transaction = db.transaction('Muestra', 'readonly');
        const store = transaction.objectStore('Muestra');
        const request = store.openCursor();
        
        const resultados = [];
        
        const muestrasBody = document.getElementById('muestrasBody');
        const muestrasTable = document.getElementById('muestrasTable');
        const noDataMessage = document.getElementById('noDataMessage');

        // Mostrar contenedor de resultados
        document.getElementById('resultadosContainer').style.display = '';
        // Limpiar resultados anteriores
        muestrasBody.innerHTML = '';
        muestrasTable.style.display = 'none';
        noDataMessage.style.display = 'none';

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const muestra = cursor.value; 

                // Aplicar filtros si se proporcionan valores
                const coincideInformante = !informanteId || muestra.InformanteId === informanteId;
                const coincideVariedad = !variedadId || muestra.VariedadId === variedadId;
                const coincideSemana = !semanaId || muestra.Semana === Number.parseInt(semanaId);
                if (coincideInformante && coincideVariedad && coincideSemana) {
                    resultados.push(muestra);
                    sMuestra = muestra;  
                    $("#analista").text(sMuestra.ObservacionAnalista);  

                    // Crear fila de tabla
                    const row = document.createElement('tr');
                                       
                    const especificaCell = document.createElement('td');
                    especificaCell.textContent =  muestra.Especificacion || 'N/A';
                    row.appendChild(especificaCell);

                    const detalleCell = document.createElement('td');
                    detalleCell.textContent =  muestra.Detalle || 'N/A';
                    row.appendChild(detalleCell);
                                        
                    const pesableCell = document.createElement('td');
                    pesableCell.textContent = muestra.EsPesable === true ? 'Si' : (muestra.EsPesable === false ? 'No' : 'N/A');
                    row.appendChild(pesableCell);

                    const cantidadCell = document.createElement('td');
                    cantidadCell.textContent = `${Number.parseInt(muestra.CantidadAnt, 10)}` || 'N/A';
                    row.appendChild(cantidadCell);    
                    
                    const precioCell = document.createElement('td');
                    precioCell.textContent = `${Number.parseFloat(muestra.PrecioRecolectadoAnt || 0).toFixed(2)}` || 'N/A';
                    row.appendChild(precioCell);
                    
                    muestrasBody.appendChild(row);
                }
                
                cursor.continue();
            } else {
                if (resultados.length > 0) {
                    muestrasTable.style.display = 'table';
                    noDataMessage.style.display = 'none';
                    $("#resultadosContainer").show();
                } else {
                    muestrasTable.style.display = 'none';
                    noDataMessage.style.display = 'block';
                }
            }
        };

     request.onerror = () => {
            console.error('Error al recorrer los datos de Muestra');
            noDataMessage.style.display = 'block';
            noDataMessage.textContent = 'Error al cargar los datos';
        };

    } catch (error) {
        console.error('Error al filtrar muestras:', error);
        noDataMessage.style.display = 'block';
        noDataMessage.textContent = 'Error al conectar con la base de datos';
    }
}

function initListarCombos() {
    const semanasSelect = document.getElementById('semanasSelect');   
    const diasSelect = document.getElementById('diasSelect');  

    if (semanasSelect) {
        cargarSelect('Semana', semanasSelect, 'id', 'descripcion', 'descripcion');        
    }    

    if (diasSelect) {
        cargarSelect('DiasSemana', diasSelect, 'iDdia', 'dia', 'orden');        
    }     
}

// Function para filtrar Muestra and cargar informantesSelect
async function filterAndPopulateInformantes() {
    const db = await IniciarBaseDatos();
    const transaction = db.transaction(['Muestra', 'Informantes'], 'readonly');
    const muestraStore = transaction.objectStore('Muestra');
    const informantesStore = transaction.objectStore('Informantes');

    const semanasSelect = document.getElementById('semanasSelect');
    const diasSelect = document.getElementById('diasSelect');
    const informantesSelect = document.getElementById('informantesSelect');

    const semanaKey = Number.parseInt(semanasSelect.value, 10);
    const diaValue = diasSelect.value; // e.g. "1"
    
    if (!semanaKey) {
        mostrarMensaje('Por favor seleccione una Semana.', "error");
        return;
    }
    if (!diaValue) {
        mostrarMensaje('Por favor seleccione un Día.', "error");
        return;
    }

    // filtrar Muestra donde el campo corresponde a semanaKey  true y diaSemanaId matches diaValue
    const filteredMuestra = [];

    // Use a promise para esperar la iteracion cursor
    await new Promise((resolve, reject) => {
        const request = muestraStore.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                const muestra = cursor.value;
                // if (muestra[semanaKey] === true && muestra.diaSemanaId === diaValue) {
                if (muestra.Semana === semanaKey && muestra.DiaSemanaId === diaValue) {
                    filteredMuestra.push(muestra);
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });

    // obtener unicos informanteIds de  Muestra filtrada
    const informanteIds = [...new Set(filteredMuestra.map(m => m.InformanteId))];
    // Fetch todos Informantes de Informantes 
    const allInformantes = await new Promise((resolve, reject) => {
        const informantes = [];
        const req = informantesStore.openCursor();
        req.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                //informantes.push(cursor.value);
                const informante = cursor.value;
                // Filtrar informantes que coincidan con la semanaKey
                if (informante.Semana === semanaKey) {
                    informantes.push(informante);
                }
                cursor.continue();
            } else {
                resolve(informantes);
            }
        };
        req.onerror = (event) => {
            reject(event.target.error);
        };
    });

    // filtrar Informantes que match con informanteIds
    const filteredInformantes = allInformantes.filter(informante =>
        informanteIds.includes(informante.CodInformante)
    );

    

    // limpiar el select
    informantesSelect.innerHTML = '<option value="" disabled selected>Seleccione Informante</option>';

    // cargar informantesSelect con informantes filtrados
    if (filteredInformantes.length > 0) {
        for (const { CodInformante, NombreInformante } of filteredInformantes) {
            const option = document.createElement('option');
            option.value = CodInformante;
            option.textContent = NombreInformante;
            informantesSelect.appendChild(option);
        }
    } else {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay informantes disponibles";
        option.disabled = true;
        informantesSelect.appendChild(option);
    }
}

// Asignar la fecha actual al input de fecha y hora
function setCurrentDateTime() {
    const input = document.getElementById('fechaInput');
    if (!input) return;
    const now = new Date();
    // Format YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    $("#anio").val(year);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    $("#mes").val(month);
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    input.value = formatted;
}

function limpiarVariedadDetalle(obj) {  
    document.getElementById('resultadosContainer').style.display = 'none';
    $('#undmSelect').select2("val", "ca");
    if (obj ==="nuevo") {
        $('#variedadesSelect').select2("val", "ca");
    }    
    $('#estadoSelect').select2("val", "ca");
    $('#cantidadInput').val("0");
    $('#precioInput').val("0");
    $('#tipomonedaSelect').prop("disabled", false);     
    $('#tipomonedaSelect').select2("val", "ca");
    $('#pesoInput').prop("disabled", true); 
    $('#pesoInput').val("0");
    $('#preciosustituidoInput').prop("disabled", true); 
    $('#preciosustituidoInput').val("0");
    $('#nvecesInput').prop("disabled", true); 
    $('#nvecesInput').val("0");
    $('#ofertachk input[type=checkbox]').prop("checked", false);
    // $('#ofertano').prop('checked', true);
    $('#descuentochk input[type=checkbox]').prop("checked", false);
    //$('#descuentono').prop('checked', true);
    $('#porcentajedescuentoInput').prop("disabled", true); 
    $('#porcentajedescuentoInput').val("0");
    $('#ivachk input[type=checkbox]').prop("checked", false);
    //$('#ivano').prop('checked', true);
    $('#propinachk input[type=checkbox]').prop("checked", false);
    //$('#propinano').prop('checked', true);
    $(".schk").prop("disabled", true);
    $('#observacionesInput').val("");
    $("#guardarBtn").prop("disabled", false );
}

// Función para insertar un nuevo registro en SeriesPrecios
async function insertarSeriePrecio() {
    try {
        // Obtener elementos del DOM
        const semanaSelect = document.getElementById('semanasSelect');
        const diasSelect = document.getElementById('diasSelect');        
        const informanteSelect = document.getElementById('informantesSelect');
        const variedadesSelect = document.getElementById('variedadesSelect');
        const resultadoSelect = document.getElementById('resultadoSelect');
        const estadoSelect = document.getElementById('estadoSelect');
        const fechaaInput = sMuestra.Fecha;
        //const precioaInput = sMuestra.PrecioRecolectadoAnt;
        const espesableInput = sMuestra.EsPesable;
        const anioInput = document.getElementById('anio');
        const mesInput = document.getElementById('mes');
        const muestraidInput = sMuestra.muestraid;
        const cantidadInput = document.getElementById('cantidadInput');
        const precioInput = document.getElementById('precioInput');
        const undmSelect = document.getElementById('undmSelect');
        const tipomonedaSelect = document.getElementById('tipomonedaSelect');
        const pesoInput = document.getElementById('pesoInput');
        const preciosustituidoInput = document.getElementById('preciosustituidoInput');
        const nvecesInput = document.getElementById('nvecesInput');
        const observacionesInput = document.getElementById('observacionesInput');
        const fechaInput = document.getElementById('fechaInput') || { value: new Date().toISOString().split('T')[0] };
        const usuarioInput = document.getElementById('hidden-usuarioId');

        // Validar que los elementos existan
        if (!informanteSelect || !variedadesSelect) {
            throw new Error('Faltan elementos del formulario requeridos');
        }       

        // Obtener valores limpios y validar tipos      
        var peso;  var preciosustituido;
        const semana = validarNumero(semanaSelect.value, 'Semana', true);
        const dia = validarCampoTexto(diasSelect.value);
        const informanteId = validarCampoTexto(informanteSelect.value, 'Informante');
        const variedadId = validarCampoTexto(variedadesSelect.value, 'Variedad');
        const fecha = validarFecha(fechaInput.value.trim(), 'Fecha');
        const resultado = validarNumero(resultadoSelect?.value, 'Resultado', true);
        const estado = validarNumero(estadoSelect?.value, 'Estado', true);
        const fechaa = fechaaInput;
        //const precioa = Number.parseFloat(precioaInput);
        const espesable = espesableInput;
        const anio = Number.parseInt(anioInput.value, 10);
        const mes = Number.parseInt(mesInput.value, 10);
        const muestraid = validarCampoTexto(muestraidInput, 'muestraid');        
        const cantidad = validarNumero(cantidadInput?.value, 'Cantidad', true, Number.parseInt(estado));        
        const precio = validarNumero(precioInput?.value, 'Precio', true, Number.parseInt(estado));
        const undm = validarCampoTexto(undmSelect?.value, 'Unidad de medida');
        const tipomoneda = validarNumero(tipomonedaSelect?.value, 'Tipo de moneda', true);
        if (estado === 4) { peso = validarNumero(pesoInput?.value, 'Peso', false); }
        else { peso = null }  
        if (estado === 2) {
            preciosustituido = validarNumero(preciosustituidoInput?.value, 'Precio sustituido', true, 4);
        }
        else {
            preciosustituido = validarNumero(preciosustituidoInput?.value, 'Precio sustituido', false);
        }
        const nveces = validarNumero(nvecesInput?.value, 'Número de veces', false);
        const porcentajedescuento = validarNumero(porcentajedescuentoInput?.value, 'Porcentaje de descuento', false);
        const observaciones = observacionesInput?.value.trim() || '';
        const usuario = validarCampoTexto(usuarioInput?.value, 'Usuario');

        // Manejo de campos booleanos
        let oferta = null;
        let descuento = null;
        let iva = null;
        let propina = null;

        const ofertaCheck = $("#ofertachk input[type='checkbox']");        

        // Convertir los checkboxes en array para trabajar con ellos
        const checkboxesoferta = Array.from(ofertaCheck);

        // Validación especial si el estado es 4
        if (estadoSelect.value == 4) {
            if (checkboxesoferta.length === 0 || !checkboxesoferta.some(cb => $(cb).prop('checked'))) {
                throw new Error("Debe seleccionar al menos una opción para 'Oferta' cuando el estado es Ninguno.");
            }
        }

        const descuentoCheck = $("#descuentochk input[type='checkbox']");

        // Convertir los checkboxes en array para trabajar con ellos
        const checkboxesdescuento = Array.from(descuentoCheck);

        // Validación especial si el estado es 4
        if (estadoSelect.value == 4) {
            if (checkboxesdescuento.length === 0 || !checkboxesdescuento.some(cb => $(cb).prop('checked'))) {
                throw new Error("Debe seleccionar al menos una opción para 'Descuento' cuando el estado es Ninguno.");
            } else {
                // Filtrar los checkboxes marcados
                const checkedValues = checkboxesdescuento
                    .filter(cb => $(cb).prop('checked'))
                    .map(cb => $(cb).val()); // Obtener el valor de cada checkbox marcado

                // Validar el porcentaje de descuento solo si no está marcado el checkbox "No tiene descuento"
                if (checkedValues[0] === "true") {
                    const v = validarNumero(porcentajedescuentoInput?.value, 'Porcentaje de descuento', false, 4);
                    if (v == 0 ) {
                        throw new Error("El porcentaje de descuento no puede ser 0 cuando tiene descuento.");
                    }
                    else if (porcentajedescuentoInput.value < 1 || porcentajedescuentoInput.value > 100) {
                        throw new Error("El porcentaje de descuento debe estar entre 1 y 100 tiene descuento.");
                    }
                }                
            }            
        }

        const ivaCheck = $("#ivachk input[type='checkbox']");

        // Convertir los checkboxes en array para trabajar con ellos
        const checkboxesiva = Array.from(ivaCheck);

        // Validación especial si el estado es 4
        if (estadoSelect.value == 4) {
            if (checkboxesiva.length === 0 || !checkboxesiva.some(cb => $(cb).prop('checked'))) {
                throw new Error("Debe seleccionar al menos una opción para 'Iva' cuando el estado es Ninguno.");
            }
        }

        const propinaCheck = $("#propinachk input[type='checkbox']");

        // Convertir los checkboxes en array para trabajar con ellos
        const checkboxespropina = Array.from(propinaCheck);

        // Validación especial si el estado es 4
        if (estadoSelect.value == 4) {
            if (checkboxespropina.length === 0 || !checkboxespropina.some(cb => $(cb).prop('checked'))) {
                throw new Error("Debe seleccionar al menos una opción para 'Propina' cuando el estado es Ninguno.");
            }
        }

        for (const value of ofertaCheck) {
            if ($(value).prop('checked') === true) {
                oferta = validarBoolean(value.value, 'Oferta');
            }
        }

        for (const value of descuentoCheck) {
            if ($(value).prop('checked') === true) {
                descuento = validarBoolean(value.value, 'Descuento');
            }
        }

        for (const value of ivaCheck) {
            if ($(value).prop('checked') === true) {
                iva = validarBoolean(value.value, 'IVA');
            }
        }

        for (const value of propinaCheck) {
            if ($(value).prop('checked') === true) {
                propina = validarBoolean(value.value, 'Propina');
            }
        }

        // Crear objeto con datos validados
        const seriePrecio = {
            InformanteId: informanteId,
            VariedadId: variedadId,
            Anio: anio,
            Mes: mes,
            Dia: dia,
            muestraid : muestraid,
            Semana: semana,
            Fecha: fechaa,
            PrecioRecolectado: precio,
            //PrecioAnterior: precioa,
            EsPesable: espesable, // no
            Peso: peso,
            Cantidad: cantidad,
            UnidadMedidaId: undm,
            EsOferta: oferta,
            TieneDescuento: descuento,
            Descuento: porcentajedescuento,
            TieneIva: iva,
            TienePropina: propina,
            MonedaId: tipomoneda,
            EstadoProductoId: estado,
            PrecioSustituidoR : preciosustituido,
            PrecioSustituidoC: 0,
            ObservacionEnumerador: observaciones,
            FechaCreacion : fecha,
            CreadoPor :  usuario,            
            Resultado: resultado, // no
            Nveces: nveces, //no
            Enviado: false, //no
            CoordenadaX: Number.parseFloat($("#lblLongitud").val()),
            CoordenadaY: Number.parseFloat($("#lblLatitud").val())
        };

        // Conectar a la base de datos
        const db = await IniciarBaseDatos();
        const transaction = db.transaction('SeriesPrecios', 'readwrite');
        const store = transaction.objectStore('SeriesPrecios');

        // Insertar registro
        const request = store.put(seriePrecio);

        // Manejar éxito
        request.onsuccess = () => {
            console.log('Registro insertado/actualizado:', seriePrecio);
            mostrarMensaje('Registro guardado exitosamente', 'success');
            let delay = alertify.get('notifier','delay');
                alertify.set('notifier','delay', 2);  
                alertify.set('notifier','position', 'bottom-center');
                alertify.success('Registros guardados exitosamente');
                alertify.set('notifier','delay', delay);
        };

        // Manejar errores
        transaction.onerror = (event) => {
            console.error('Error en transacción:', event.target.error);
            mostrarMensaje(`Error al guardar: ${event.target.error.message}`, 'danger');
            let delay = alertify.get('notifier','delay');
                alertify.set('notifier','delay', 2);  
                alertify.set('notifier','position', 'bottom-center');
                alertify.error(`Error al guardar: ${event.target.error.message}`);
                alertify.set('notifier','delay', delay);
        };

        // Completar transacción
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });       

        return {
            success: true,
            message: 'Registro guardado exitosamente',
            data: seriePrecio
        };

    } catch (error) {
        console.error('Error en insertarSeriePrecio:', error);
        mostrarMensaje(`Error: ${error.message}`, 'danger');
        let delay = alertify.get('notifier','delay');
            alertify.set('notifier','delay', 2);  
            alertify.set('notifier','position', 'bottom-center');
            alertify.error(`Error al guardar: ${error.message}`);
            alertify.set('notifier','delay', delay);
        return {
            success: false,
            message: error.message
        };
    }
}

// Función para insertar un arreglo de registros en SeriesPrecios que no se realizo
async function InsertarRegistroNoRealizado() {
    try {
        // Paso 1: Abrir base de datos
        const db = await openDB();

        const informanteSelect = document.getElementById('informantesSelect');
        const informanteId = validarCampoTexto(informanteSelect.value, 'Informante');

        // Paso 2: Buscar todas las VariedadId asociadas al InformanteId en "Muestra"
        const transactionMuestra = db.transaction("Muestra", "readonly");
        const storeMuestra = transactionMuestra.objectStore("Muestra");
        const indexMuestra = storeMuestra.index("BuscarxInformante"); // Índice para filtrar por InformanteId
        const request = indexMuestra.getAll(IDBKeyRange.only(informanteId));

        const registrosMuestra = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(
                request.result.map(m => ({
                    VariedadId: m.VariedadId,
                    Fecha: m.Fecha,
                    muestraid : m.muestraid,
                    PrecioRecolectadoAnt: m.PrecioRecolectadoAnt,
                    EsPesable: m.EsPesable,
                    Nveces: m.Nveces
                }))
            );
            request.onerror = () => reject("Error al obtener los registros de Muestra");
        });

        if (registrosMuestra.length === 0) {
            throw new Error("No se encontraron registros en Muestra para este Informante.");
        }

        // Eliminar duplicados basados en VariedadId (opcional según tu lógica)
        const variedadesUnicasMap = new Map();
        for (const registro of registrosMuestra) {
            if (!variedadesUnicasMap.has(registro.VariedadId)) {
                variedadesUnicasMap.set(registro.VariedadId, registro);
            }
        }
        const variedadesUnicas = Array.from(variedadesUnicasMap.values());

        // Configuración común desde formulario
        const semanaSelect = document.getElementById('semanasSelect');
        const diasSelect = document.getElementById('diasSelect');        
        const fechaInput = document.getElementById('fechaInput') || { value: new Date().toISOString().split('T')[0] };
        const usuarioInput = document.getElementById('hidden-usuarioId');

        const semana = Number.parseInt(semanaSelect.value);
        const dia = validarCampoTexto(diasSelect.value);  
        const anio = Number.parseInt(document.getElementById('anio').value, 10);
        const mes = Number.parseInt(document.getElementById('mes').value, 10);        
        const cantidad = Number.parseInt(1);
        const precio = Number.parseFloat(0);
        const undm = null;
        const tipomoneda = null;
        const peso = null;
        const preciosustituido = null;
        const porcentajedescuento = null;
        const observaciones = null;
        const usuario = validarCampoTexto(usuarioInput?.value, 'Usuario');
        const oferta = null; // Asumiendo valores booleanos fijos
        const descuento = null;
        const iva = null;
        const propina = null;

        const fecha = validarFecha(fechaInput.value.trim(), 'Fecha');
        const resultado = Number.parseInt(2);
        const estado = Number.parseInt(0);

        // Paso 3: Insertar en "SeriesPrecios" para cada registro
        const transactionSeries = db.transaction("SeriesPrecios", "readwrite");
        const storeSeries = transactionSeries.objectStore("SeriesPrecios");

        for (const registro of variedadesUnicas) {
            const seriePrecio = {
                InformanteId: informanteId,
                VariedadId: registro.VariedadId,
                Anio: anio,
                Mes: mes,
                Dia: dia,
                muestraid : registro.muestraid,
                Semana: semana,
                Fecha: registro.Fecha,
                PrecioRecolectado: precio,
                //PrecioAnterior: Number.parseFloat(registro.PrecioRecolectadoAnt),
                EsPesable: Boolean(registro.EsPesable),
                Peso: peso,
                Cantidad: cantidad,
                UnidadMedidaId: undm,
                EsOferta: oferta,
                TieneDescuento: descuento,
                Descuento: porcentajedescuento,
                TieneIva: iva,
                TienePropina: propina,
                MonedaId: tipomoneda,
                EstadoProductoId: estado,
                PrecioSustituidoR: preciosustituido,
                PrecioSustituidoC: null,
                ObservacionEnumerador: observaciones,
                FechaCreacion: fecha,
                CreadoPor: usuario,
                Resultado: resultado,
                Nveces: Number.parseInt(registro.Nveces) + 1,
                Enviado: false,
                CoordenadaX: Number.parseFloat($("#lblLongitud").val()),
                CoordenadaY: Number.parseFloat($("#lblLatitud").val())
            };
            
            const requestPut = storeSeries.put(seriePrecio);
            
            await new Promise((resolve, reject) => {
                requestPut.onsuccess = resolve;
                requestPut.onerror = () => reject(requestPut.error);
            });
        }       

        // Esperar completación de transacción
        await new Promise((resolve, reject) => {
            transactionSeries.oncomplete = resolve;
            transactionSeries.onerror = () => reject(transactionSeries.error);
        });

        mostrarMensaje('Registros guardados exitosamente', 'success');
        let delay = alertify.get('notifier','delay');
            alertify.set('notifier','delay', 2);  
            alertify.set('notifier','position', 'bottom-center');
            alertify.success('Registros guardados exitosamente');
            alertify.set('notifier','delay', delay);
        // alertify.set('notifier','position', 'bottom-center');
        // alertify.success('Registros guardados exitosamente');
        return {
            success: true,
            message: `Se insertaron ${variedadesUnicas.length} registros.`,
        };

    } catch (error) {
        console.error('Error en InsertarRegistroNoRealizado:', error);
        mostrarMensaje(`Error: ${error.message}`, 'danger');
        let delay = alertify.get('notifier','delay');
            alertify.set('notifier','delay', 2);  
            alertify.set('notifier','position', 'bottom-center');
            alertify.error(`Error: ${error.message}`);
            alertify.set('notifier','delay', delay);
        return {
            success: false,
            message: error.message
        };
    }
}

function validarCampoTexto(valor, nombreCampo) {
    const valorLimpio = valor?.trim();
    if (!valorLimpio) {
        throw new Error(`${nombreCampo} es obligatorio`);
    }
    return valorLimpio;
}

function validarNumero(valor, nombreCampo, esRequerido = false, estado = 0) {
    // Verificar si el valor es una cadena vacía
    if (esRequerido && (!valor || valor.trim() === '')) {
        throw new Error(`${nombreCampo} es obligatorio y debe ser un número ${estado === 4 ? 'mayor que 0' : 'positivo'}`);
    }
    
    const valorNumerico = Number(valor?.trim());
    
    // Validar si el valor no es un número
    if (Number.isNaN(valorNumerico)) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} es obligatorio y debe ser un número ${estado === 4 ? 'mayor que 0' : 'positivo'}`);
        }
        return 0; // Valor por defecto para campos no requeridos
    }
    
    // Validar según el estado
    if (estado === 4 && valorNumerico <= 0) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} debe ser mayor que 0`);
        }
        return 0; // Valor por defecto para campos no requeridos
    } else if (estado !== 4 && valorNumerico < 0) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} es obligatorio y debe ser un número positivo`);
        }
        return 0; // Valor por defecto para campos no requeridos
    }
    
    return valorNumerico;
}

function validarNumero2(valor, nombreCampo, esRequerido = false) {
    // Verificar si el valor es una cadena vacía
    if (esRequerido && (!valor || valor.trim() === '')) {
        throw new Error(`${nombreCampo} es obligatorio y debe ser un número positivo`);
    }
    const valorNumerico = Number(valor?.trim());
    // Validar si el valor no es un número o es negativo
    if (Number.isNaN(valorNumerico) || (esRequerido && valorNumerico < 0)) {
        if (esRequerido) {
            throw new Error(`${nombreCampo} es obligatorio y debe ser un número positivo`);
        }
        return 0; // Valor por defecto para campos no requeridos
    }
    
    return valorNumerico;
}

function validarBoolean(valor, nombreCampo) {
    if (valor?.trim().toLowerCase() === 'true') return true;
    if (valor?.trim().toLowerCase() === 'false') return false;
    throw new Error(`${nombreCampo} debe ser true o false`);
}

function validarFecha(fecha, nombreCampo) {
    const fechaValida = new Date(fecha);
    if (Number.isNaN(fechaValida.getTime())) {
        throw new Error(`${nombreCampo} no es una fecha válida`);
    }
    return fecha;
}

function limpiarFormulario() {
    // Reiniciar selects
    const selects = [
        'informantesSelect',
        'variedadesSelect',
        'resultadoSelect',
        'estadoSelect',
        'undmSelect',
        'tipomonedaSelect'
    ];

    for (const id of selects) {
        const select = document.getElementById(id);
        if (select) select.selectedIndex = -1;
    }

    // Reiniciar inputs numéricos y de texto
    const inputsLimpiar = [
        'fechaa',
        'precioa',
        'espesable',
        'detalle',
        'cantidadInput',
        'precioInput',
        'pesoInput',
        'preciosustituidoInput',
        'nvecesInput',
        'porcentajedescuentoInput',
        'observacionesInput'
    ];

    for (const id of inputsLimpiar) {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
            if (input.type === 'number') {
                input.value = 0;
            }
        }
    }

    // Reiniciar checkboxes
    const checkboxes = [
        '#ofertachk input[type="checkbox"]',
        '#descuentochk input[type="checkbox"]',
        '#ivachk input[type="checkbox"]',
        '#propinachk input[type="checkbox"]'
    ];

    for (const selector of checkboxes) {
        for (const checkbox of $(selector)) {
            $(checkbox).prop('checked', false);
        }
    }

    // Reiniciar fecha (si no es de solo lectura)
    const fechaInput = document.getElementById('fechaInput');    
    if (fechaInput && !fechaInput.readOnly) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    // Enfocar primer campo
    const primerCampo = document.getElementById('variedadesSelect');
    if (primerCampo) primerCampo.focus();

    mostrarMensaje('Formulario limpiado para nuevo registro', 'info');
}

async function cargarSeriePrecio(informanteId, variedadId, semana) {
    try {
        // Validar que los parámetros sean válidos
        if (!informanteId || !variedadId || !semana) {
            throw new Error('Informante, Variedad y Semana son requeridos');
        }

        // Limpiar espacios en los valores
        const cleanInformante = informanteId.trim();
        const cleanVariedad = variedadId.trim();
        const cleanSemana = Number.parseInt(semana);

        // Abrir la base de datos
        const db = await IniciarBaseDatos();
        const transaction = db.transaction('SeriesPrecios', 'readonly');
        const store = transaction.objectStore('SeriesPrecios');

         // Verificar si existe el índice necesario
        if (!store.indexNames.contains('BuscarxInfVarSem')) {
            throw new Error('Índice BuscarxInfVarSem no encontrado');
        }
       
        // Usar índice y rango de clave para búsqueda directa
        const index = store.index('BuscarxInfVarSem');
        const keyRange = IDBKeyRange.only([cleanInformante, cleanVariedad, cleanSemana]);
        const cursorRequest = index.openCursor(keyRange);

        const resultados = [];
    
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Agregar el registro encontrado
                resultados.push(cursor.value);
                cursor.continue();
            } else {
                // Procesar resultados
                if (resultados.length > 0) {
                    rellenarFormulario(resultados[0]); 
                } else {
                    // No hay registros
                    limpiarVariedadDetalle("editar");
                    mostrarMensaje("No se ha ingresado Serie Precio", "warning");
                }
            }
        };

        cursorRequest.onerror = (event) => {
            console.error('Error al buscar en SeriesPrecios:', event.target.error);
            mostrarMensaje(`Error al buscar serie de precio: ${event.target.error.message}`, "danger");
        };

    } catch (error) {
        console.error('Error en cargarSeriePrecio:', error);
        mostrarMensaje(`Error al procesar los datos: ${error.message}`, "danger");
    }
}

async function cargarSeriePrecio2(informanteId, variedadId) {
    try {
        // Validar que los parámetros sean válidos
        if (!informanteId || !variedadId) {
            throw new Error('Informante y Variedad son requeridos');
        }

        // Limpiar espacios en los valores
        const cleanInformante = informanteId.trim();
        const cleanVariedad = variedadId.trim();

        // Abrir la base de datos
        const db = await IniciarBaseDatos();
        const transaction = db.transaction('SeriesPrecios', 'readonly');
        const store = transaction.objectStore('SeriesPrecios');

        // ✅ Verificar si existe el índice necesario
        if (!store.indexNames.contains('BuscarPorInformanteYVariedad')) {
            throw new Error('Índice BuscarPorInformanteYVariedad no encontrado');
        }

        // ✅ Usar índice y rango de clave para búsqueda directa
        const index = store.index('BuscarPorInformanteYVariedad');
        const keyRange = IDBKeyRange.only([cleanInformante, cleanVariedad]);
        const cursorRequest = index.openCursor(keyRange);

        const resultados = [];
    
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Agregar el registro encontrado
                resultados.push(cursor.value);
                cursor.continue();
            } else {
                // Procesar resultados
                if (resultados.length > 0) {
                    rellenarFormulario(resultados[0]); 
                } else {
                    // No hay registros
                    limpiarVariedadDetalle("editar");
                    mostrarMensaje("No se ha ingresado Serie Precio", "warning");
                }
            }
        };

        cursorRequest.onerror = (event) => {
            console.error('Error al buscar en SeriesPrecios:', event.target.error);
            mostrarMensaje(`Error al buscar serie de precio: ${event.target.error.message}`, "danger");
        };

    } catch (error) {
        console.error('Error en cargarSeriePrecio:', error);
        mostrarMensaje(`Error al procesar los datos: ${error.message}`, "danger");
    }
}

// Función auxiliar para rellenar checkbox
function setCheckboxState(yesId, noId, value) {
    const yesElem = document.getElementById(yesId);
    const noElem = document.getElementById(noId);
    if (yesElem && noElem) {
        yesElem.checked = value === true;
        noElem.checked = value !== true;
    }
}

//funcion con los datos incontrados rellena input
function setFormFields(registro) {
    $("#estadoSelect").val(registro.EstadoProductoId).trigger("change");
    setTimeout(() => {
        $("#undmSelect").val(registro.UnidadMedidaId).trigger("change");
    }, 200);
    $("#tipomonedaSelect").val(registro.MonedaId).trigger("change");
    $("#pesoInput").val(registro.Peso);
    if (registro.EsPesable === true) { $("#pesoInput").prop("disabled", false);
    } else  { $("#pesoInput").prop("disabled", true );}
    
    $("#preciosustituidoInput").val(registro.PrecioSustituidoR);
    $("#cantidadInput").val(registro.Cantidad);
    $("#precioInput").val(registro.PrecioRecolectado);
    $("#nvecesInput").val(registro.Nveces);
}

//funcion con los datos encontrados marcar checkbox
function setEstadoProductoCheckboxes(registro) {
    setCheckboxState("ofertasi", "ofertano", registro.EsOferta);
    setCheckboxState("descuentosi", "descuentono", registro.TieneDescuento);
    $("#porcentajedescuentoInput").val(registro.Descuento);
    setCheckboxState("ivasi", "ivano", registro.TieneIva);
    setCheckboxState("propinasi", "propinano", registro.TienePropina);
    $(".schk").prop("disabled", false);
}

// funcion para mostrar el detalle del informante
async function getInformanteDetalle(codInformante, semana) {
const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('InformanteDetalle', 'readonly');
    const store = tx.objectStore('InformanteDetalle');

    // Asegurarse de que los campos sean string si así se guardaron
    const key = [String(codInformante), Number.parseInt(semana)];

    const req = store.get(key);

    req.onsuccess = () => {
      const registro = req.result;
      if (registro) {
        // Llenar los inputs con los datos del registro        
        document.getElementById('regionInput').value = registro.Region || '';
        document.getElementById('barrioInput').value = registro.Barrio || '';
        document.getElementById('direccionInput').value = registro.Direccion || '';
        document.getElementById('cvariedadesInput').value = registro.Cantidad || '';

        resolve(registro);
      } else {
        // console.warn('No se encontró ningún registro con la clave:', key);
        // Limpiar los campos si no hay resultado
        document.getElementById('regionInput').value = '';
        document.getElementById('barrioInput').value = '';
        document.getElementById('direccionInput').value = '';        
        document.getElementById('cvariedadesInput').value = '';
        resolve(null); // Resolvemos con null si no se encuentra
      }
    };

    req.onerror = () => {
      console.error('Error al buscar el registro:', req.error);
      reject(req.error);
    };
  });
}

// Función para rellenar el formulario con los datos encontrados
async function rellenarFormulario(registro) {    
    $("#lblLongitud").val(registro.CoordenadaX);
    $("#lblLatitud").val(registro.CoordenadaY);

    if (registro.Resultado === 1) {
        setFormFields(registro);

        if (registro.EstadoProductoId === 4) {
            setEstadoProductoCheckboxes(registro);
        }

        $("#observacionesInput").val(registro.ObservacionEnumerador);

        if (registro.EstadoProductoId === 4) {
            $("#guardarBtn").prop("disabled", false );
            $("#variedadDetalle").css({ opacity: 1 });
            $("#variedadDetalle").css("pointer-events", "auto"); 
        }
        else {
            $("#guardarBtn").prop("disabled", true );    
        }
       
    } else {
        $("#resultadoSelect").val(registro.Resultado).trigger("change");
        $("#filtrarBtn").prop("disabled", true );
        $("#variedadDetalle").css({ opacity: 0.5 });
        $("#variedadDetalle").css("pointer-events", "none");
    }

    mostrarMensaje("Datos cargados correctamente", "success");
}

async function compararRegistros(informanteId) {
    try {
        // Validar parámetro
        if (!informanteId) {
            throw new Error('InformanteId es requerido');
        }
        
        // Limpiar espacios en el valor
        const cleanId = informanteId.trim();
        
        // Abrir base de datos
        const db = await IniciarBaseDatos();
        
        // Contar registros en Muestra
        const muestraCount = await new Promise((resolve, reject) => {
            const transaction = db.transaction('Muestra', 'readonly');
            const store = transaction.objectStore('Muestra');
            
            // Usar cursor para contar registros donde InformanteId == cleanId
            const cursorRequest = store.openCursor();
            let count = 0;
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // El keyPath es ['InformanteId', 'VariedadId']
                    if (cursor.key[0] === cleanId) {
                        count++;
                    }
                    cursor.continue();
                } else {
                    resolve(count);
                }
            };
            
            cursorRequest.onerror = (event) => {
                console.error('Error al contar Muestra:', event.target.error);
                reject(event.target.error);
            };
        });
        
        // Contar registros en SeriesPrecios usando índice
        const seriesCount = await new Promise((resolve, reject) => {
            const transaction = db.transaction('SeriesPrecios', 'readonly');
            const store = transaction.objectStore('SeriesPrecios');
            
            // Usar índice compuesto BuscarPorInformanteYVariedad
            const index = store.index('BuscarPorInformanteYVariedad');
            
            // Crear rango para buscar todos los registros de este informante
            const keyRange = IDBKeyRange.bound(
                [cleanId, ''], 
                [cleanId, '\uffff']
            );
            
            const cursorRequest = index.openCursor(keyRange);
            let count = 0;
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    count++;
                    cursor.continue();
                } else {
                    resolve(count);
                }
            };
            
            cursorRequest.onerror = (event) => {
                console.error('Error al contar SeriesPrecios:', event.target.error);
                reject(event.target.error);
            };
        });
        
        // Comparar resultados
        if (muestraCount > 0 && muestraCount === seriesCount) {
            mostrarMensaje("Ya se ingresaron todas las variedades del informante", "success");
        } else if (muestraCount > 0 && muestraCount !== seriesCount) {
            mostrarMensaje(`Variedades ingresadas por el informante (${seriesCount}/${muestraCount})`, "warning");
        } else if (muestraCount === 0) {
            mostrarMensaje("No hay registros en Muestra para este informante", "danger");
        } else {
            mostrarMensaje("No se encontraron datos para comparar", "info");
        }
        
        return {
            success: true,
            data: {
                muestraCount,
                seriesCount
            }
        };
        
    } catch (error) {
        console.error('Error en comparación:', error);
        mostrarMensaje(`Error al comparar registros: ${error.message}`, "danger");
        return {
            success: false,
            error: error.message
        };
    }
}

async function mostrarDiferencias(informanteId, semana) {
    try {
        const db = await IniciarBaseDatos();
        
        // 1. Obtener todas las variedades del informante desde Muestra
        const muestraMap = new Map(); // VariedadId -> descripcion
        const muestraTransaction = db.transaction('Muestra', 'readonly');
        const muestraStore = muestraTransaction.objectStore('Muestra');
        //! const muestraCursorRequest = muestraStore.openCursor();
       
        const index = muestraStore.index('BuscarxInformanteYSemana');

        const request = index.getAll([String(informanteId), Number.parseInt(semana)]);

        request.onsuccess = function(event) {
            const results = event.target.result;
            if (results.length > 0) {
                // Procesar los resultados
                results.forEach(registro => {
                    muestraMap.set(registro.VariedadId, registro.Descripcion);
                });
            } else {
                console.warn('No se encontraron registros para la combinación Informante y Semana');
            }
        };

        // 2. Construir mapa de descripciones de Muestra
        // await new Promise((resolve, reject) => {
        //     muestraCursorRequest.onsuccess = (event) => {
        //         const cursor = event.target.result;
        //         if (cursor) {
        //             if (cursor.key[0] === informanteId.trim()) {
        //                 muestraMap.set(cursor.key[1], cursor.value.Descripcion);
        //             }
        //             cursor.continue();
        //         } else {
        //             resolve();
        //         }
        //     };
        //     muestraCursorRequest.onerror = reject;
        // });

        // 3. Obtener todas las variedades ya registradas en SeriesPrecios
        const seriesSet = new Set();
        const seriesTransaction = db.transaction('SeriesPrecios', 'readonly');
        const seriesIndex = seriesTransaction.objectStore('SeriesPrecios').index('BuscarPorInformanteYVariedad');
        // ✅ Usar IDBKeyRange.bound() para buscar todas las VariedadId para este InformanteId
        const keyRange = IDBKeyRange.bound(
            [informanteId.trim(), ''], 
            [informanteId.trim(), '\uffff']
        );
        
        const seriesCursorRequest = seriesIndex.openCursor(keyRange);

        // 4. Llenar el Set con las variedades ya registradas
        await new Promise((resolve, reject) => {
            seriesCursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // El keyPath es ['InformanteId', 'VariedadId', 'Fecha'], pero el índice solo tiene ['InformanteId', 'VariedadId']
                    const variedadId = cursor.key[1]; 
                    if (variedadId) seriesSet.add(variedadId.trim());
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            seriesCursorRequest.onerror = reject;
        });        
        
        // 5. Encontrar las faltantes comparando con Muestra
        const faltantes = [...muestraMap.keys()].filter(id => !seriesSet.has(id));
        // 6. Mostrar listado de faltantes
        mostrarListadoFaltantes(faltantes, muestraMap);
        
        // 7. Resaltar opciones en variedadesSelect
        //resaltarFaltantes(faltantes);

    } catch (error) {
        console.error('Error al mostrar diferencias:', error);
        mostrarMensaje(`Error al comparar registros: ${error.message}`, "danger");
    }
}

async function marcarInformantesConDatosHoy() {
    const db = await openDB();
    const informantesSelect = $('#informantesSelect'); // Usamos jQuery para select2

    // Obtener fecha de hoy en formato ISO
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const fechaInicio = hoyStr + 'T00:00:00';
    const fechaFin = hoyStr + 'T23:59:59';

    const informantesHoy = new Set();

    const transaction = db.transaction(['SeriesPrecios'], 'readonly');
    const almacenSeries = transaction.objectStore('SeriesPrecios');
    const index = almacenSeries.index('BuscarPorFechaCreacion');
    const fechaRango = IDBKeyRange.bound(fechaInicio, fechaFin);
    const cursorRequest = index.openCursor(fechaRango);

    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const registro = cursor.value;
            const informanteId = registro.InformanteId;

            if (informanteId !== undefined) {
                informantesHoy.add(informanteId);
            }

            cursor.continue(); // Continuar al siguiente
        } else {
            // cursor terminando => inicializar select2 con plantilla personalizada
            inicializarSelect2ConMarcacion(informantesSelect, informantesHoy);
            //actualizarSelect2(informantesSelect, informantesHoy);
        }
    };

    cursorRequest.onerror = function(event) {
        console.error("Error al leer los datos de SeriesPrecios:", event.target.error);
    };
}

async function marcarVariedadesConDatos() {
    const db = await openDB();
    const informantesSelect = $('#informantesSelect').val(); // Usamos jQuery para select2
    let semanaSelect = $('#semanasSelect').val();
    semanaSelect = Number.parseInt(semanaSelect);
    const variedadesSelect = $('#variedadesSelect')

    const variedadesHoy = new Set();

    const transaction = db.transaction(['SeriesPrecios'], 'readonly');
    const almacenSeries = transaction.objectStore('SeriesPrecios');
    const index = almacenSeries.index('BuscarxInfSem');
    const Rango = IDBKeyRange.bound([informantesSelect, semanaSelect], [informantesSelect, semanaSelect]);

    const cursorRequest = index.openCursor(Rango);

    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const registro = cursor.value;
            const variedadId = registro.VariedadId;

            if (variedadId !== undefined) {
                variedadesHoy.add(variedadId);
            }

            cursor.continue(); // Continuar al siguiente
        } else {
            // cursor terminando => inicializar select2 con plantilla personalizada
            inicializarSelect2ConMarcacion(variedadesSelect, variedadesHoy);
        }
    };

    cursorRequest.onerror = function(event) {
        console.error("Error al leer los datos de SeriesPrecios:", event.target.error);
    };
}

// Función que inicializa select2 con templateResult para marcar opciones
function inicializarSelect2ConMarcacion(selectElement, itemHoySet) {
    // Destruir instancia previa si existe (para reinicializar)
    if (selectElement.hasClass('select2-hidden-accessible')) {
        selectElement.select2('destroy');
    }
    // Iniciar select2 con templateResult para opciones
    selectElement.select2({
        width: 'resolve',
        templateResult: function(option) {
            if (!option.id) {
                return option.text;
            }
            // Crear contenedor jQuery para aplicar estilos
            const $option = $('<span></span>').text(option.text);
            if (itemHoySet.has(option.id)) {
                $option.addClass('informante-datos-hoy');
                $option.attr('title', 'Este item tiene datos');
            }
            return $option;
        },
        // También manejamos templateSelection para título al mostrar selección
        templateSelection: function(option) {
            if (!option.id) {
                return option.text;
            }
            let $selection = $('<span></span>').text(option.text);
            if (itemHoySet.has(option.id)) {
                $selection.attr('title', 'Este item tiene datos');
            }
            return $selection;
        },
        escapeMarkup: function(markup) { return markup; } // Permite HTML en templates
    });
}

function actualizarSelect2(selectElement, informantesHoy) {
    // Iterar sobre las opciones del select2
    selectElement.find('option').each(function() {
        const optionValue = $(this).val();
        const tieneDatosHoy = informantesHoy.has(optionValue);
        // Cambiar el color de fondo y el título
        $(this).toggleClass('informante-datos-hoy', tieneDatosHoy);
        $(this).attr('title', tieneDatosHoy ? "Este informante tiene datos hoy" : "");
    });
    // Actualizar el select2 para reflejar los cambios
    selectElement.select2(); // Re-inicializar select2 para aplicar cambios
}

async function enviarDatos(obj) {
    try {
        const response = await jsonSeriesPrecios(obj);
        const registrosNoEnviados = response.SeriesPrecios; // Extraemos los registros no enviados
        if (registrosNoEnviados.length === 0) {           
            mostrarMensaje("No hay registros pendientes por enviar", "success");
            return;
        }

        const jsonData = JSON.stringify(response); // Convertir a JSON

        const messageDiv = document.getElementById('message');
        messageDiv.classList.add('d-none'); // Ocultar mensaje anterior

        //Hacer la solicitud AJAX POST  https://localhost:7062  https://appcepov.inide.gob.ni
        $.ajax({
            url: 'https://appcepov.inide.gob.ni/endpoint/cipc/bulksupin', // Reemplaza con la URL de tu endpoint
            type: 'POST',
            contentType: 'application/json',
            mode: 'cors',
            data: jsonData,
            success: async (serverResponse) => {  
                try {
                    // Marcar los registros como enviados en IndexedDB
                    await marcarComoEnviados(registrosNoEnviados);
                    mostrarMensaje(`Datos enviados y actualizados localmente. Respuesta del servidor: ${JSON.stringify(serverResponse)}`, "success");
                    //? messageDiv.textContent = `Datos enviados exitosamente ${response}`;
                } catch (error) {
                    console.error("Error al marcar como enviados:", error);                  
                    mostrarMensaje(`Datos enviados, pero no se pudo actualizar el estado local: ${error}`, "error");
                }                
            },
            error: (xhr, status, error) => {
                mostrarMensaje(`Error al enviar los datos: ${error}`, "error");            
                //console.error "Detalles del error:", xhr.responseText
            }           
        });
    } catch (error) {
        console.error(error);
    }
}

async function jsonSeriesPrecios(obj) {
    try {
        const db = await openDB();
        const transaction = db.transaction(['SeriesPrecios'], 'readonly');
        const store = transaction.objectStore('SeriesPrecios');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                // Filtro según el valor de obj
                const registrosNoEnviados = request.result.filter(item => {
                    const baseCondition = item.Enviado === false && item.EsPesable === obj;

                    if (!baseCondition) return false;

                    // Si es pesable (obj === true), verificar que Peso sea válido
                    if (obj === true) {
                        return item.Peso === null ||  item.Peso > 0;
                    }

                    return true; // Para obj === false, no hay más condiciones
                });

                // Mapeo de SeriesPrecios_
                const SeriesPrecios = registrosNoEnviados.map(item => ({
                    InformanteId: item.InformanteId,
                    VariedadId: item.VariedadId,
                    Anio: item.Anio,
                    Mes: item.Mes,
                    muestraid: item.muestraid,
                    Semana: item.Semana,
                    Fecha: item.Fecha,
                    PrecioRecolectado: item.PrecioRecolectado,
                    PrecioAnterior: item.PrecioAnterior,
                    Peso: item.Peso,
                    Cantidad: item.Cantidad,
                    UnidadMedidaId: item.UnidadMedidaId,
                    EsOferta: Boolean(item.EsOferta),
                    TieneDescuento: Boolean(item.TieneDescuento),
                    Descuento: item.Descuento,
                    TieneIva: Boolean(item.TieneIva),
                    TienePropina: Boolean(item.TienePropina),
                    MonedaId: item.MonedaId,
                    EstadoProductoId: item.EstadoProductoId,
                    PrecioSustituidoR: item.PrecioSustituidoR,
                    PrecioSustituidoC: item.PrecioSustituidoC,
                    ObservacionEnumerador: item.ObservacionEnumerador,
                    FechaCreacion: item.FechaCreacion,
                    CreadoPor: item.CreadoPor
                }));

                // Mapeo de Muestras
                const Muestras = registrosNoEnviados.map(item => ({
                    InformanteId: item.InformanteId,
                    VariedadId: item.VariedadId,
                    Nveces: item.Nveces
                }));

                // Creación de Informantes sin duplicados
                const informantesMap = new Map();
                registrosNoEnviados.forEach(item => {
                    const codInformante = item.InformanteId;
                    if (!informantesMap.has(codInformante)) {
                        informantesMap.set(codInformante, {
                            CodInformante: codInformante,
                            NombreInformante: "",
                            Direccion: "",
                            DistritoId: "",
                            Activo: true,
                            CoordenadaX: item.CoordenadaX,
                            CoordenadaY: item.CoordenadaY,
                            IdEmpleado: item.CreadoPor
                        });
                    }
                });

                const Informantes = Array.from(informantesMap.values());

                // Resolución del resultado
                resolve({
                    SeriesPrecios: SeriesPrecios,
                    Muestras: Muestras,
                    Informantes: Informantes
                });
            };

            request.onerror = () => {
                reject("Error al obtener los registros de SeriesPrecios");
            };
        });
    } catch (error) {
        console.error("Error al abrir la base de datos:", error);
        throw error;
    }
}

async function jsonSeriesPrecios1(obj) {
    try {
        const db = await openDB();
        const transaction = db.transaction(['SeriesPrecios'], 'readonly');
        const store = transaction.objectStore('SeriesPrecios');
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                // Filtrar los registros que no han sido enviados y que son no pesables
                const registrosNoEnviados = request.result.filter(item => 
                    item.Enviado === true   && item.EsPesable === obj
                );  

                const SeriesPrecios_ = registrosNoEnviados.map(item => ({
                    InformanteId: item.InformanteId,
                    VariedadId: item.VariedadId,
                    Anio: item.Anio,
                    Mes: item.Mes,
                    muestraid : item.muestraid,
                    Semana: item.Semana,
                    Fecha: item.Fecha,
                    PrecioRecolectado: item.PrecioRecolectado,
                    PrecioAnterior: item.PrecioAnterior,
                    Peso: item.Peso,
                    Cantidad: item.Cantidad,
                    UnidadMedidaId: item.UnidadMedidaId,
                    EsOferta: Boolean(item.EsOferta),
                    TieneDescuento: Boolean(item.TieneDescuento),
                    Descuento: item.Descuento,
                    TieneIva: Boolean(item.TieneIva),
                    TienePropina: Boolean(item.TienePropina),
                    MonedaId: item.MonedaId,
                    EstadoProductoId: item.EstadoProductoId,
                    PrecioSustituidoR: item.PrecioSustituidoR,
                    PrecioSustituidoC: item.PrecioSustituidoC,
                    ObservacionEnumerador: item.ObservacionEnumerador,
                    FechaCreacion: item.FechaCreacion,
                    CreadoPor: item.CreadoPor                    
                }));

                const Muestras = registrosNoEnviados.map(item => ({
                    InformanteId: item.InformanteId,
                    VariedadId: item.VariedadId,
                    Nveces : item.Nveces
                }));

                // Usamos un Set para evitar duplicados por CodInformante
                const informantesMap = new Map();
                registrosNoEnviados.forEach(item => {
                    const codInformante = item.InformanteId;
                    if (!informantesMap.has(codInformante)) {
                        informantesMap.set(codInformante, {
                            CodInformante: codInformante,
                            NombreInformante: "",
                            Direccion: "",
                            Activo: true,
                            CoordenadaX: item.CoordenadaX,
                            CoordenadaY: item.CoordenadaY
                        });
                    }
                });

                const Informantes = Array.from(informantesMap.values());

                resolve({
                    SeriesPrecios_: SeriesPrecios_,
                    Muestras: Muestras,
                    Informantes: Informantes
                });
            };

            request.onerror = () => {
                reject("Error al obtener los registros de SeriesPrecios");
            };
        });
    } catch (error) {
        console.error("Error al abrir la base de datos:", error);
        throw error;
    }
}

// Función auxiliar para abrir la base de datos
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("IPC");

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject("Error al abrir la base de datos");
    });
}

async function marcarComoEnviados(registros) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("IPC");

        request.onsuccess = async (event) => {
            const db = event.target.result;
            const transaction = db.transaction(["SeriesPrecios"], "readwrite");
            const store = transaction.objectStore("SeriesPrecios");

            try {
                for (const registro of registros) {
                    const key = [registro.InformanteId, registro.VariedadId, registro.Fecha];
                    const getItemRequest = store.get(key);

                    // Promisify IndexedDB request
                    const item = await new Promise((res, rej) => {
                        getItemRequest.onsuccess = () => res(getItemRequest.result);
                        getItemRequest.onerror = () => rej(getItemRequest.error);
                    });

                    if (item && item.Enviado === false) {
                        item.Enviado = true;
                        const putRequest = store.put(item);

                        await new Promise((res, rej) => {
                            putRequest.onsuccess = () => res();
                            putRequest.onerror = () => rej(putRequest.error);
                        });
                    }
                }

                transaction.oncomplete = () => resolve();
            } catch (error) {
                console.error("Error al actualizar los registros:", error);
                reject(`Error al marcar como enviados: ${error.message}`);
            }
        };

        request.onerror = (event) => {
            reject("Error al abrir la base de datos.");
        };
    });
}

function resaltarFaltantes(faltantes) {
    const variedadesSelect = document.getElementById('variedadesSelect');
    if (!variedadesSelect) return;
    
    // Limpiar resaltados anteriores
    for (const option of variedadesSelect.options) {
        option.style.backgroundColor = '';
    }
    
    // Resaltar variedades faltantes
    for (const id of faltantes) {
        const option = Array.from(variedadesSelect.options).find(o => o.value === id);
        if (option) option.style.backgroundColor = '#ffeeba'; // Amarillo suave
    }
}

function mostrarListadoFaltantes(faltantes, muestraMap) {
    // Verificar si ya existe un modal para evitar duplicados
    let modal = document.getElementById('modalVariedadesFaltantes');
    if (!modal) {
        // 1. Crear estructura del modal si no existe
        modal = document.createElement('div');
        modal.id = 'modalVariedadesFaltantes';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'variedadesFaltantesLabel');
        modal.setAttribute('aria-hidden', 'true');

        // 2. Contenido del modal
        modal.innerHTML = `
            <div class="modal-dialog modal-sm" role="document">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title" id="variedadesFaltantesLabel">Variedades Faltantes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body" id="modalVariedadesBody">
                        <!-- Aquí se mostrará el contenido -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        // Agregar al body
        document.body.appendChild(modal);
    }

    // 3. Obtener el cuerpo del modal
    const modalBody = document.getElementById('modalVariedadesBody');
    if (!modalBody) return;

    // Limpiar contenido anterior
    modalBody.innerHTML = '';

    // 4. Si no hay faltantes, mostrar mensaje
    if (faltantes.length === 0) {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert-success';
        alerta.textContent = 'No faltan variedades por ingresar.';
        modalBody.appendChild(alerta);
    } else {
        // 5. Crear lista de faltantes
        const listGroup = document.createElement('ul');
        listGroup.className = 'list-group';

        for (const id of faltantes) {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            
            // Obtener descripción del mapa o usar ID como respaldo
            const descripcion = muestraMap.get(id) || 'Descripción no encontrada';
            
            // Mostrar descripción y ID  <span class="badge bg-primary">${id}</span>
            li.innerHTML = `
                <span>${descripcion}</span>                
            `;
            listGroup.appendChild(li);
        }

        modalBody.appendChild(listGroup);

        // 6. Inicializar y mostrar el modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

async function obtenerValidaMuestra(empleado) {
    try {
        // Obtener datos desde la API https://appcepov.inide.gob.ni https://localhost:7062
        const response = await fetch(`https://appcepov.inide.gob.ni/endpoint/cipc/Validamuestra/${empleado}`,  {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            mode: 'cors'
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            const errorMessage = errorResponse.mensaje || `Error en la solicitud HTTP: ${response.status}`;
            throw new Error(errorMessage);
            //throw new Error(`Error en la solicitud HTTP: ${response.status}`);
        }

        const catalog = await response.json();

        if (!catalog || !Array.isArray(catalog)) {
            throw new Error('Formato de respuesta inválido');
        }

        // Mostrar modal con los resultados
        const modalBody = document.getElementById("modalFaltantesBody");
        const modalTitle = document.getElementById("modalFaltantesLabel");

        if (catalog.length === 0) {
            modalTitle.textContent = "Sin Registros Faltantes";
            modalBody.innerHTML = `
                <div class="alert alert-success text-center" role="alert">
                    ¡No hay informantes con variedades faltantes!
                </div>
            `;
        } else {
            modalTitle.textContent = "Informantes con Variedades Faltantes";

            const listGroup = document.createElement("ul");
            listGroup.className = "list-group list-group-flush";

            catalog.forEach(item => {
                const li = document.createElement("li");
                li.className = "list-group-item d-flex justify-content-between align-items-center";
                li.innerHTML = `
                    <span><strong>${item.nombreInformante} / Semana ${item.semana}</strong></span>
                    <button class="btn btn-sm btn-primary" onclick="irMuestra(${item.semana}, '${item.diaSemanaId}', '${item.codInformante.trim()}')">
                        Ver
                    </button>                    
                `; //<span class="badge bg-danger rounded-pill">${item.Cantidad} variedades</span>
                listGroup.appendChild(li);
            });

            modalBody.innerHTML = "";
            modalBody.appendChild(listGroup);
        }

        // Mostrar el modal
        const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
        bsModal.show();

        return {
            success: true,
            message: `Informantes con variedades faltantes: ${catalog.length}`,
            data: catalog
        };

    } catch (error) {
        console.error("Error al validar muestras:", error);
        const modalBody = document.getElementById("modalFaltantesBody");
        const modalTitle = document.getElementById("modalFaltantesLabel");

        modalTitle.textContent = "Error al Validar Muestras";
        modalBody.innerHTML = `
            <div class="alert alert-danger text-center" role="alert">
                Error al obtener los datos: ${error.message}
            </div>
        `;

        const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
        bsModal.show();

        return {
            success: false,
            message: error.message,
            data: []
        };
    }
}

async function mostrarPesableFaltante() {
  try {
    const db = await openDB();

    // 1. Obtener todos los registros válidos de SeriesPrecios
    const records = await getValidSeriesRecords(db);
    if (!records.length) {
      // Mostrar modal sin resultados
      mostrarModal([]);
      return {
        success: true,
        message: "No hay registros con pesables faltantes"
      };
    }

    // 2. Procesar cada registro para obtener NombreInformante y Descripcion
    const resultado = [];

    for (const record of records) {
      const informanteId = record.InformanteId;
      const variedadId = record.VariedadId;
      const semana = record.Semana;
      const dia = record.Dia;

      const [informante, variedad] = await Promise.all([
        getInformante(db, informanteId, semana),
        getVariedad(db, variedadId, informanteId)
      ]);

      if (informante && variedad) {
        resultado.push({
          NombreInformante: informante.NombreInformante,
          Descripcion: variedad.Descripcion,
          Semana: semana,
          Dia: dia,
          InformanteId: informanteId
        });
      }
    }

    // 3. Mostrar resultados
    mostrarModal(resultado);

    db.close();

    return {
      success: true,
      message: `Informantes con variedades faltantes: ${resultado.length}`,
      data: resultado
    };

  } catch (error) {
    console.error("Error en mostrarPesableFaltante:", error);
    return {
      success: false,
      message: `Error al procesar datos: ${error.message}`
    };
  }
}

function getValidSeriesRecords(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('SeriesPrecios', 'readonly');
    const store = tx.objectStore('SeriesPrecios');
    const records = [];

    const cursor = store.openCursor();

    cursor.onsuccess = function(e) {
      const c = e.target.result;
      if (c) {
        const record = c.value;

        if (
          record.EsPesable === true &&
          record.Enviado === false &&
          record.Peso === Number.parseInt(0)
          //(record.Peso <= 0 || record.Peso === null)
        ) {
          records.push(record);
        }

        c.continue();
      } else {
        resolve(records);
      }
    };

    cursor.onerror = function(e) {
      reject(e.target.error);
    };
  });
}

function getInformante2(db, informanteId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('Informantes', 'readonly');
    const store = tx.objectStore('Informantes');
    const index = store.index('BuscarInformante');
    const req = index.getAll(String(informanteId)); // Obtener todos los registros que coincidan

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getInformante(db, informanteId, semana) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('Informantes', 'readonly');
    const store = tx.objectStore('Informantes');
    
    // Crear el array clave según el keyPath definido ['CodInformante', 'Semana']
    const key = [String(informanteId), Number.parseInt(semana)];
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(req.result);
    };
    
    req.onerror = () => {
      reject(req.error);
    };
  });
}

function getVariedad(db, variedadId, informanteId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('Variedades', 'readonly');
    const store = tx.objectStore('Variedades');
    // Forzar ambos valores a ser strings y mantener el formato esperado
    const key = [String(variedadId), String(informanteId)];
    const req = store.get(key);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function mostrarModal(resultado) {
  const modalBody = document.getElementById("modalFaltantesBody");
  const modalTitle = document.getElementById("modalFaltantesLabel");

  if (resultado.length === 0) {
    modalTitle.textContent = "Sin Registros Faltantes";
    modalBody.innerHTML = `
      <div class="alert alert-success text-center" role="alert">
        ¡No hay informantes con pesables faltantes!
      </div>
    `;
  } else {
    modalTitle.textContent = "Informantes con Pesables Faltantes";

    const listGroup = document.createElement("ul");
    listGroup.className = "list-group list-group-flush";

    resultado.forEach(item => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
                    <span><strong>${item.NombreInformante} - ${item.Descripcion}</strong></span>
                    <button class="btn btn-sm btn-primary" onclick="irMuestra(${item.Semana}, '${item.Dia}', '${item.InformanteId.trim()}')">
                        Ver
                    </button>                    
                `;
    //   li.innerHTML = `<span><strong>${item.NombreInformante} - ${item.Descripcion}</strong></span>`;
      listGroup.appendChild(li);
    });

    modalBody.innerHTML = "";
    modalBody.appendChild(listGroup);
  }

  const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
  bsModal.show();
}

function irMuestra(semana, diaSemanaId, codInformante) {
    // Obtener instancia del modal
    const modalElement = document.getElementById('modalFaltantes');
    const bsModal = bootstrap.Modal.getInstance(modalElement);

    // Si el modal está abierto, cierra y limpia propiedades
    if (bsModal) {
        bsModal.hide(); // Cierra el modal

        // Opcional: Eliminar la instancia del modal para que no se pueda reabrir
        //bsModal.dispose(); 

        // Opcional: Remover backdrop y backdrop de fondo si queda
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        // Opcional: Deshabilitar el botón u otros elementos relacionados al modal
        // const botonAbrirModal = document.querySelector('[data-bs-target="#modalFaltantes"]');
        // if (botonAbrirModal) {
        //     botonAbrirModal.disabled = true;
        //     botonAbrirModal.classList.add('disabled');
        // }
    }

    // Navegar a la nueva vista (ajusta esto según tu estructura)
    loadView('ListarMuestra.html', () => {
        // Asegúrate de que estos elementos existan antes de manipularlos
        const semanasSelect = document.getElementById('semanasSelect');
        const diasSelect = document.getElementById('diasSelect');

        if (semanasSelect && diasSelect) {
            // Seleccionar valor en los combos
            $("#semanasSelect").val(semana).trigger("change");
            $("#diasSelect").val(diaSemanaId).trigger("change");
            filterAndPopulateInformantes().then(resultado => {
                $("#informantesSelect").val(codInformante).trigger("change");
                 mostrarDiferencias(codInformante,semana);
                $('#resultadoSelect').select2("val", "ca");
                $("#resultadoSelect").prop("disabled", false);     
            });
        } else {
            console.warn("Alguno de los selects no existe aún.");
        }
    });
}

// Encapsula todos los eventos de ListarMuestra.html
function setupListarMuestraEventListeners() {
    // Manejador de evento para el botón de filtrar
    document.getElementById('filtrarBtn').addEventListener('click', () => {
        const estadoId = $("#resultadoSelect").val();
        if (estadoId==1) {  
            document.getElementById('variedadDetalle').style.display = 'block'; 
            marcarVariedadesConDatos();
        }
        else {
            $("#filtrarBtn").prop("disabled", true);
            InsertarRegistroNoRealizado()
            .then(() => { // Usa una función flecha para asegurar que `this` se mantenga correcto.                
                return marcarInformantesConDatosHoy(); // Retorna la promesa de marcarInformantesConDatosHoy()
            })
            .catch(error => {
                console.error("Ocurrió un error en la cadena de promesas:", error);
                // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
                // throw error;        
            });
        }
    });                        

    document.getElementById('limpiarBtn').addEventListener('click', () => {
        limpiarVariedadDetalle("nuevo"); 
    });

    document.getElementById('guardarBtn').addEventListener('click', () => {
        insertarSeriePrecio()
        .then(resultado => {
            if (!resultado.success) {
                mostrarMensaje(`Error: ${resultado.message}`, 'error');
            } 
            else {
                // Limpiar formulario después de guardar
                limpiarVariedadDetalle("nuevo");
                marcarInformantesConDatosHoy();
                marcarVariedadesConDatos();
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
        });
    });
    
    document.getElementById('btnfiltrarIngresadas').addEventListener('click', () => {
        const informanteId = $('#informantesSelect').val();
        const semana = document.getElementById('semanasSelect'); 
        mostrarDiferencias(informanteId, semana.value);
    });
    
    $('#diasSelect').on('select2:select',  function (e) { 
        filterAndPopulateInformantes()
        .then(() => { // Usa una función flecha para asegurar que `this` se mantenga correcto.
            return marcarInformantesConDatosHoy(); // Retorna la promesa de marcarInformantesConDatosHoy()
        })
        .catch(error => {
            console.error("Ocurrió un error en la cadena de promesas:", error);
            // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
            // throw error;        
        });
    });

    $('#informantesSelect').on('select2:select', async function (e) {
        const informanteId = $(this).val();
        const variedadDetalle = document.getElementById('variedadDetalle'); 
        const semana = document.getElementById('semanasSelect'); 
        try {
            //? await compararRegistros(informanteId);
            getLocation();            
            getInformanteDetalle(informanteId, semana.value)
            .then(registro => {
                if (registro) {
                console.log('Registro encontrado:', registro);
                } else {
                console.log('No se encontró registro.');
                }
            })
            .catch(error => {
                console.error('Error en la base de datos:', error);
            });
            mostrarDiferencias(informanteId, semana.value);                            
            $('#resultadoSelect').select2("val", "ca");
            $("#resultadoSelect").prop("disabled", false);
            $("#filtrarBtn").prop("disabled", true );
            $("#guardarBtn").prop("disabled", false );                               
            variedadDetalle.style.display = 'none';
            limpiarVariedadDetalle("nuevo");

            //? const cant = await actualizarCantidad(informanteId);
            //? $("#cpproducto").val(cant);
        } catch (error) {
            console.log('Error al comparar registros:', error);
            mostrarMensaje('No se puedo recuperar numerador.', "error");
        }
        

        //? actualizarCantidad(informanteId).then(cant => {
        //    $("#cpproducto").val(cant);
        //}).catch(error => {
        //    mostrarMensaje('No se puedo recuperar numerador.', "error");
        //});
    });
    
    // ✅ Alternativa usando evento de Select2
    $('#resultadoSelect').on('select2:select', function (e) {                              
        //const estadoId = $(this).val();
        //if (estadoId==1) {
            const informanteId = $("#informantesSelect").val().trim();
            const variedadesSelect = document.getElementById('variedadesSelect');  
            
            // Habilitar el select
            variedadesSelect.disabled = false;

            // Limpiar el contenido del select
            $(variedadesSelect).empty(); // Usar .empty() para limpiar el contenido
            
            // Mostrar mensaje de carga
            variedadesSelect.innerHTML = '<option value="">Cargando variedades...</option>';

            // Cargar variedades filtradas por informanteId
            cargarSelect('Variedades', variedadesSelect, 'id', 'Descripcion', 'id', 'informanteId', informanteId);
                                                    
            // Si no hay variedades
            if (variedadesSelect.options.length < 1) {
                variedadesSelect.disabled = true;
                variedadesSelect.innerHTML = '<option value="">No hay variedades para este informante</option>';
            }
                $("#filtrarBtn").prop("disabled", false);
        // } 
        // else {
        //     $("#filtrarBtn").prop("disabled", true);
        //     InsertarRegistroNoRealizado()
        //     .then(() => { // Usa una función flecha para asegurar que `this` se mantenga correcto.
        //         return marcarInformantesConDatosHoy(); // Retorna la promesa de marcarInformantesConDatosHoy()
        //     })
        //     .catch(error => {
        //         console.error("Ocurrió un error en la cadena de promesas:", error);
        //         // Opcional: Lanza el error de nuevo si quieres que el error se propague aún más.
        //         // throw error;        
        //     });
        // }                            
    });

    $('#variedadesSelect').on('select2:select', async function (e) { 
        const informanteId = document.getElementById('informantesSelect').value;                            
        const variedadId = $(this).val();
        const semanaId = document.getElementById('semanasSelect').value;
        const undmSelect = document.getElementById('undmSelect');  

        // Validar al menos un filtro seleccionado
        if (!informanteId || !variedadId) {
            mostrarMensaje('Por favor seleccione ambos criterios de filtrado: Informante y Variedad.', "error");
            return;
        }                            
        
        // Llamar a la función para filtrar muestras
        filtrarMuestras(informanteId, variedadId, semanaId);

        undmSelect.disabled = false;                          
    
        undmSelect.innerHTML = '<option value="">Cargando unidades...</option>';
        // Cargar variedades filtradas por informanteId
        await cargarSelect('UmedP', undmSelect, 'urecol', 'urecol', 'urecol', 'codproducto', variedadId);
                                        
        // Si no hay variedades
        if (undmSelect.options.length < 1) {
            undmSelect.disabled = true;
            undmSelect.innerHTML = '<option value="">No hay unidades para esta variedad</option>';
        } else {
            // Cargar serie de precios
            await  cargarSeriePrecio(informanteId, variedadId, semanaId);
        }  
    });

    $('#estadoSelect').on('select2:select', function (e) {
        const estadoId = $(this).val();
        const vecesn = Number.parseInt(sMuestra.Nveces) + 1;
        const pesablees = sMuestra.EsPesable;
        $("#cantidadInput").val(0);                            
        $("#undmSelect").val(sMuestra.UnidadMedidaId).trigger("change");
        if (estadoId > 0 && estadoId < 4) { 
            $("#undmSelect").prop("disabled", true);
            $("#cantidadInput").prop("disabled", true);
            $("#precioInput").val(0)
            $("#precioInput").prop("disabled", true);
            $('#pesoInput').prop("disabled", true);
             $('#tipomonedaSelect').prop("disabled", true);            
            if (estadoId== 2) {
                $('#preciosustituidoInput').prop("disabled", false);  
            } else { $('#preciosustituidoInput').prop("disabled", true); }                                
            $("#nvecesInput").val(vecesn);
            $(".schk").prop("disabled", true);                        
        }  else {
            $("#undmSelect").prop("disabled", false); 
            $("#cantidadInput").prop("disabled", false);
            $("#precioInput").val(0);  
            $("#precioInput").prop("disabled", false);
            $('#tipomonedaSelect').prop("disabled", false);
            if (pesablees) {
                    $('#pesoInput').prop("disabled", false);  
            } else { $('#pesoInput').prop("disabled", true); }  
            $('#preciosustituidoInput').val(0);
            $('#preciosustituidoInput').prop("disabled", true);  
            $(".schk").prop("disabled", false);
            //? $('#ofertano').prop('checked', true);  
            //? $('#descuentono').prop('checked', true);
            //? $('#ivano').prop('checked', true);
            //? $('#propinano').prop('checked', true);                       
        } 
        $("#tipomonedaSelect").val(1).trigger("change");                             
    });    

    $('#ofertachk').on('click', 'input[type=checkbox]', function () {
        $('#ofertachk input[type=checkbox]').prop("checked", false);
        $(this).prop("checked", true);
    });

    $('#descuentochk').on('click', 'input[type=checkbox]', function () {
        $('#descuentochk input[type=checkbox]').prop("checked", false);
        $(this).prop("checked", true);
        $(this).val() == "true" ? $("#porcentajedescuentoInput").prop("disabled", false) : $("#porcentajedescuentoInput").prop("disabled", true);
    });

    $('#ivachk').on('click', 'input[type=checkbox]', function () {
        $('#ivachk input[type=checkbox]').prop("checked", false);
        $(this).prop("checked", true);
    });

    $('#propinachk').on('click', 'input[type=checkbox]', function () {
        $('#propinachk input[type=checkbox]').prop("checked", false);
        $(this).prop("checked", true);
    });
}

// evalua el numerador del informante y devuelve su cantidad
async function actualizarCantidad(informanteId) {
    const db = await IniciarBaseDatos();
    return new Promise((resolve, reject) => {       
        const transaction = db.transaction('Numerador', 'readonly');
        const store = transaction.objectStore('Numerador');

        const requestGet = store.get(informanteId);

        requestGet.onerror = (event) => {
            reject(event.target.error);
        };

        requestGet.onsuccess = (event) => {
            const record = event.target.result;
            if (record) {
                // encontrado, incrementa cantidad
                record.cantidad = (record.cantidad || 0) + 1;
                resolve(record.cantidad);
            } else {
                // no encontrado,  cantidad=1
                resolve(1);
            }
        };
    });
}

// Función para obtener una muestra por ID
async function getMuestraById(id) {
    const db = await IniciarBaseDatos();
    const transaction = db.transaction('Muestra', 'readonly');
    const store = transaction.objectStore('Muestra');
    const request = store.get(id);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Error al obtener la muestra');
    });
}

// Función que se llama desde el botón de cada fila
async function SeleccionarMuestra(muestraId) {
    if (!muestraId) {
        console.error('ID de muestra no válido');
        return;
    }

    try {
        const muestra = await getMuestraById(muestraId);
        const detalleDiv = document.getElementById('muestrasDetalle');

        // Plantilla de detalle con formulario editable
        detalleDiv.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    Detalle de Muestra
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label for="muestraid" class="form-label">ID de la Muestra:</label>
                        <input type="text" class="form-control" id="muestraid" value="${muestra.id}" disabled>
                    </div>
                    <div class="mb-3">
                        <label for="detalle" class="form-label">Detalle:</label>
                        <input type="text" class="form-control" id="detalle" value="${muestra.detalle || ''}">
                    </div>
                    <div class="mb-3">
                        <label for="sem1" class="form-label">Sem1:</label>
                        <select id="sem1" class="form-select">
                            <option value="true" ${muestra.sem1 === true ? 'selected' : ''}>Activo</option>
                            <option value="false" ${muestra.sem1 === false ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="nveces" class="form-label">nveces:</label>
                        <input type="text" class="form-control" id="nveces" value="${muestra.nveces}">
                    </div>
                    <div class="d-grid gap-2 mt-3">
                        <button class="btn btn-success btn-sm" onclick="actualizarMuestra('${muestra.id}')">
                            <i class="bi bi-save"></i> Actualizar Muestra
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        document.getElementById('muestrasDetalle').innerHTML = `
            <div class="alert alert-danger" role="alert">
                No se pudo cargar el detalle de la muestra.
            </div>
        `;
    }
}

// Función para actualizar la muestra
async function actualizarMuestra(id) {
    try {
        if (!id || id.trim() === '') {
            alert('ID de muestra no válido');
            return;
        }

        const detalleDiv = document.getElementById('muestrasDetalle');
        const detalle = $("#detalle").val(); //? document.getElementById('detalle').value;
        const sem1 = $("#sem1").val();
        const nveces = $("#nveces").val();
        const usuario = $("#hidden-usuarioId").val();
        const lng = $("#lblLongitud").val();
        const lat = $("#lblLatitud").val();

        const db = await IniciarBaseDatos();
        const transaction = db.transaction('Muestra', 'readwrite');
        const store = transaction.objectStore('Muestra');
        
        // Obtener el registro actual
        const idNumerico = Number(id);
        const request = store.get(idNumerico);
        
        request.onsuccess = async () => {
            
            // Obtener el registro actual
            const registroActualizado = request.result;
            // 🔍 Validación: Si no se encuentra el registro
            if (!registroActualizado) {
                alert('No se encontró el registro para actualizar');
                return;
            }
            
            // Actualizar solo los campos editables
            registroActualizado.detalle = detalle;
            registroActualizado.sem1 = sem1;
            registroActualizado.nveces = nveces;
            registroActualizado.usuario = usuario;
            registroActualizado.lng = lng;
            registroActualizado.lat = lat;
            
            // Guardar cambios
            const putRequest = store.put(registroActualizado);
            
            putRequest.onsuccess = () => {
                mostrarMensaje('Muestra actualizada correctamente', "success");
                
                // Refrescar la tabla con los mismos filtros
                detalleDiv.innerHTML = '';
                const informanteId = document.getElementById('informantesSelect').value;
                const variedadId = document.getElementById('variedadesSelect').value;
                const semanaId = document.getElementById('semanaSelect').value;
                filtrarMuestras(informanteId, variedadId, semanaId);
            };
            
            putRequest.onerror = () => {
                alert('Error al actualizar la muestra');
            };
        };
        
        request.onerror = () => {
            alert('Error al obtener la muestra para actualizar');
        };
        
    } catch (error) {
        console.error('Error al actualizar la muestra:', error);
        alert('Ocurrió un error al guardar los cambios');
    }
}

async function actualizarNveces() {
    const informanteId = "11-1000016";
    const variedadId = "011420403";
    const fecha = "2025-05-06T00:00:00"; // Asegúrate que coincida exactamente con el formato almacenado

    try {
        const db = await openDB(); // Usamos la función auxiliar definida antes
        const transaction = db.transaction(["SeriesPrecios"], "readwrite");
        const store = transaction.objectStore("SeriesPrecios");

        // 1. Obtener el registro por clave compuesta
        const keyPath = [informanteId, variedadId, fecha];
        const getRequest = store.get(keyPath);

        const item = await new Promise((resolve, reject) => {
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject("Error al obtener el registro.");
        });

        if (!item) {
            throw new Error("Registro no encontrado.");
        }

        // 2. Actualizar el campo Nveces
        //item.Nveces = 0;
        item.Enviado = false;

        // 3. Guardar el registro actualizado
        const putRequest = store.put(item);

        await new Promise((resolve, reject) => {
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject("Error al guardar el registro actualizado.");
        });

        console.log("Registro actualizado exitosamente.");
    } catch (error) {
        console.error("Error al actualizar el registro:", error);
    }
}

async function actualizarNveces2() {
    try {
        const db = await openDB(); // Usamos la función auxiliar definida antes
        const transaction = db.transaction(["SeriesPrecios"], "readwrite");
        const store = transaction.objectStore("SeriesPrecios");

        // 1. Obtener todos los registros
        const getAllRequest = store.getAll();

        const items = await new Promise((resolve, reject) => {
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject("Error al obtener los registros.");
        });

        if (!items || items.length === 0) {
            throw new Error("No se encontraron registros.");
        }

        // 2. Actualizar el campo deseado en todos los registros
        items.forEach(item => {
            item.Enviado = false; // Actualiza el campo Enviado a false
            // Puedes agregar más campos a actualizar aquí si es necesario
        });

        // 3. Guardar los registros actualizados
        const promises = items.map(item => {
            const putRequest = store.put(item);
            return new Promise((resolve, reject) => {
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject("Error al guardar el registro actualizado.");
            });
        });

        await Promise.all(promises); // Esperar a que se guarden todos los registros

        console.log("Todos los registros actualizados exitosamente.");
    } catch (error) {
        console.error("Error al actualizar los registros:", error);
    }
}


function setCurrentDateTime2() {
    const input = document.getElementById('fechaInput');
    if (!input) return;

    const now = new Date();
    
    // Formato con 7 decimales (microsegundos)
    const year = now.getFullYear();
    $("#anio").val(year)
    const month = String(now.getMonth() + 1).padStart(2, '0');
    $("#mes").val()
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    // Formato completo para SQL Server: YYYY-MM-DDTHH:MM:SS.SFFFFFFF
    const formatted = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000`;
    
    input.value = formatted; // Aún mostrando solo HH:MM
    input.setAttribute('data-full-datetime', formatted); // Almacenar el formato completo
}

function getFullDateTime() {
    const input = document.getElementById('fechaInput');
    const storedValue = input.getAttribute('data-full-datetime');
    
    // Si no se ha guardado antes, genera uno nuevo
    if (storedValue) return storedValue;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000`;
}

function mostrarListadoFaltantes2(faltantes, muestraMap) {
    const contenedor = document.getElementById('listadoFaltantes');
    if (!contenedor || faltantes.length === 0) return;

    // Limpiar contenedor anterior
    contenedor.innerHTML = '';

    // Crear listado de faltantes
    const card = document.createElement('div');
    card.className = 'card mt-3';
    
    const header = document.createElement('div');
    header.className = 'card-header bg-warning text-dark';
    header.textContent = 'Variedades Faltantes';
    
    const listGroup = document.createElement('ul');
    listGroup.className = 'list-group list-group-flush';
    
    // Agregar cada variedad faltante con su descripción
    for (const id of faltantes) {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        const descripcion = muestraMap.get(id) || id;
        li.textContent = `${descripcion} (${id})`;
        listGroup.appendChild(li);
    }

    card.appendChild(header);
    card.appendChild(listGroup);
    contenedor.appendChild(card);
}

function limpiarFormulario2() {
    const variedadesSelect = document.getElementById('variedadesSelect');
    if (!variedadesSelect) return;

    for (const option of Array.from(variedadesSelect.options)) {
        option.style.backgroundColor = '';
    }
}

async function insertarSeriePrecio2() {
    try {
        // Obtener valores de los elementos del DOM
        const informanteSelect = document.getElementById('informantesSelect');
        const variedadesSelect = document.getElementById('variedadesSelect');
        const resultadoSelect = document.getElementById('resultadoSelect');
        const estadoSelect = document.getElementById('estadoSelect');
        const cantidadInput = document.getElementById('cantidadInput');
        const precioInput = document.getElementById('precioInput');
        const undmSelect =  document.getElementById('undmSelect');
        const tipomonedaSelect = document.getElementById('tipomonedaSelect');
        const pesoInput = document.getElementById('pesoInput');
        const preciosustituidoInput = document.getElementById('preciosustituidoInput');
        const nvecesInput = document.getElementById('nvecesInput');
        let ofertaActivo;
        const ofertaCheck = $("#ofertachk input[type='checkbox']");
        for (const value of ofertaCheck) {
            if ($(value).prop('checked') === true) {
                ofertaActivo = value.value;
            }
        }
        let descuentoActivo;
        const descuentoCheck = $("#descuentochk input[type='checkbox']");
        for (const value of descuentoCheck) {
            if ($(value).prop('checked') === true) {
                descuentoActivo = value.value;
            }
        }
        const porcentajedescuentoInput = document.getElementById('porcentajedescuentoInput');
        let ivaActivo;
        const ivaCheck = $("#ivachk input[type='checkbox']");
        for (const value of ivaCheck) {
            if ($(value).prop('checked') === true) {
                ivaActivo = value.value;
            }
        }
        let propinaActivo;
        const propinaCheck = $("#propinachk input[type='checkbox']");
        for (const value of propinaCheck) {
            if ($(value).prop('checked') === true) {
                propinaActivo = value.value;
            }
        }
        const observacionesInput = document.getElementById('observacionesInput');
        
        
        // Asumiendo que hay un campo de fecha en el formulario
        const fechaInput = document.getElementById('fechaInput') || { value: new Date().toISOString().split('T')[0] };
        
        // Validar que existan los elementos necesarios
        if (!informanteSelect || !variedadesSelect) {
            throw new Error('Faltan elementos del formulario requeridos');
        }
        
        // Obtener valores limpios
        const informanteId = informanteSelect ? informanteSelect.value.trim() : null;
        const variedadId = variedadesSelect ? variedadesSelect.value.trim() : null;
        const fecha = fechaInput.value.trim() || new Date().toISOString().split('T')[0];
        const resultado = resultadoSelect ? resultadoSelect.value.trim() : null;
        const estado = estadoSelect ? estadoSelect.value.trim() : null;
        const cantidad = cantidadInput ? Number.parseInt(cantidadInput.value.trim(), 10) : 0;
        const precio = precioInput ? Number.parseFloat(precioInput.value.trim()) : 0;
        const undm =  undmSelect.value.trim();
        const tipomoneda = tipomonedaSelect ? tipomonedaSelect.value.trim() : null;
        const peso = pesoInput ? Number.parseInt(pesoInput.value.trim(), 10) : 0;
        const preciosustituido = preciosustituidoInput ? Number.parseFloat(preciosustituidoInput.value.trim()) : 0;
        const nveces = nvecesInput ? Number.parseInt(nvecesInput.value.trim(), 10) : 0;
        const oferta = ofertaActivo;
        const descuento = descuentoActivo;
        const porcentajedescuento = porcentajedescuentoInput ? Number.parseFloat(porcentajedescuentoInput.value.trim()) : 0;
        const iva = ivaActivo;
        const propina = propinaActivo;
        const observaciones =  observacionesInput ? observacionesInput.value.trim() : '';

        // Validar datos obligatorios
        if (!informanteId || !variedadId) {
            throw new Error('Debe seleccionar un informante y una variedad');
        }
        
        // Crear objeto con datos a insertar
        const seriePrecio = {
            InformanteId: informanteId,
            VariedadId: variedadId,
            Fecha: fecha,
            Resultado: resultado,
            Estado: estado,
            Cantidad: cantidad,
            Precio: precio, // Valor por defecto - podría venir de otro campo
            Undm: undm, 
            TipoMoneda: tipomoneda,
            Peso: peso,
            PrecioSustituido: preciosustituido,
            Nveces: nveces,
            Oferta: oferta,
            Descuento: descuento,
            PorcentajeDescuento: porcentajedescuento,
            Iva: iva,
            Propina: propina,
            Observaciones: observaciones
            //Activo: true // Estado inicial
        };
        
        // Conectar a la base de datos
        const db = await IniciarBaseDatos();
        
        // Iniciar transacción
        const transaction = db.transaction('SeriesPrecios', 'readwrite');
        const store = transaction.objectStore('SeriesPrecios');
        
        // Insertar registro
        const request = store.put(seriePrecio);
        
        // Manejar éxito
        request.onsuccess = () => {
            console.log('Registro insertado/actualizado:', seriePrecio);
            mostrarMensaje('Registro guardado exitosamente', 'success');
            
            // Opcional: Limpiar formulario o actualizar listados
            if (variedadesSelect) {
                variedadesSelect.selectedIndex = -1;
            }
            if (fechaInput && !fechaInput.readOnly) {
                fechaInput.value = new Date().toISOString().split('T')[0];
            }
        };
        
        // Manejar errores
        transaction.onerror = (event) => {
            console.error('Error en transacción:', event.target.error);
            mostrarMensaje(`Error al guardar: ${event.target.error.message}`, 'danger');
        };
        
        // Completar transacción
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });
        
        return {
            success: true,
            message: 'Registro guardado exitosamente',
            data: seriePrecio
        };

    } catch (error) {
        console.error('Error en insertarSeriePrecio:', error);
        mostrarMensaje(`Error: ${error.message}`, 'danger');
        return {
            success: false,
            message: error.message
        };
    }
}

async function cargarSelect1(storeName, selectElement, keyField, displayField, sortField, filterField = null, filterValue = null) {
    try {
        const db = await IniciarBaseDatos();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        // ✅ Usar el índice si existe
        let dataSource = store;
        if (filterField && store.indexNames.contains(filterField)) {
            dataSource = store.index(filterField);
        }

        // ✅ Usar getAll si hay filtro, o openCursor si no
        const items = [];

        if (!filterValue) {
            // ✅ Usar getAll si hay valor de filtro
            const getAllRequest = dataSource.getAll(filterValue);
            
            getAllRequest.onsuccess = () => {
                const resultados = getAllRequest.result || [];
                
                resultados.sort((a, b) => a[sortField].localeCompare(b[sortField]));

                selectElement.innerHTML = '';
                if (resultados.length > 0) {
                    for (const item of resultados) {
                        const option = document.createElement('option');
                        option.value = item[keyField];
                        option.textContent = item[displayField];
                        selectElement.appendChild(option);
                        selectElement.selectedIndex = -1;
                    }
                } else {
                    selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
                }

                $(selectElement).trigger('change');
            };

            getAllRequest.onerror = (e) => {
                console.error("Error al obtener datos filtrados:", e.target.error);
                selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
                $(selectElement).trigger('change');
            };
        } else {
            // ❌ Si no hay filtro, seguir usando cursor para obtener todos
            const cursorRequest = dataSource.openCursor();

            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const item = cursor.value;

                    // ✅ Asegurarse de que el campo tenga el valor esperado
                    if (!filterField || item[filterField] === filterValue) {
                        items.push(item);
                    }

                    cursor.continue();
                } else {
                    items.sort((a, b) => a[sortField].localeCompare(b[sortField]));

                    selectElement.innerHTML = '';
                    if (items.length > 0) {
                        for (const item of items) {
                            const option = document.createElement('option');
                            option.value = item[keyField];
                            option.textContent = item[displayField];
                            selectElement.appendChild(option);
                            selectElement.selectedIndex = -1;
                        }
                    } //else {
                      //  selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
                    //}

                    $(selectElement).trigger('change');
                }
            };

            cursorRequest.onerror = (e) => {
                console.error("Error al abrir cursor:", e.target.error);
                selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
                $(selectElement).trigger('change');
            };
        }

    } catch (error) {
        console.error(`Error al cargar ${storeName}:`, error);
        selectElement.innerHTML = '<option value="">Error de conexión</option>';
        $(selectElement).trigger('change');
    }
}

async function cargarSeriePrecio3(informanteId, variedadId) {
    try {
        // Validar que los parámetros sean válidos
        if (!informanteId || !variedadId) {
            throw new Error('Informante y Variedad son requeridos');
        }

        // Limpiar espacios en los valores
        const cleanInformante = informanteId.trim();
        const cleanVariedad = variedadId.trim();

        // Abrir la base de datos
        const db = await IniciarBaseDatos();
        const transaction = db.transaction('SeriesPrecios', 'readonly');
        const store = transaction.objectStore('SeriesPrecios');

        // ✅ Verificar si existe el índice necesario
        if (!store.indexNames.contains('BuscarPorInformanteYVariedad')) {
            throw new Error('Índice BuscarPorInformanteYVariedad no encontrado');
        }

        // ✅ Usar índice y rango de clave para búsqueda directa
        const index = store.index('BuscarPorInformanteYVariedad');
        const keyRange = IDBKeyRange.only([cleanInformante, cleanVariedad]);
        const cursorRequest = index.openCursor(keyRange);

        //?const request = store.openCursor();
        const resultados = [];
    
        //?request.onsuccess = (event) => {
        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                // Agregar el registro encontrado
                resultados.push(cursor.value);                

                //? const record = cursor.value;
                
                //? Filtrar manualmente por InformanteId y VariedadId
                //?if (record.InformanteId === cleanInformante && record.VariedadId === cleanVariedad) {
                //?    resultados.push(record);
                //? }
                cursor.continue();
            } else {
                // Procesar resultados
                if (resultados.length > 0) {
                    rellenarFormulario(resultados[0]); 
                    //? Seleccionar el registro más reciente por fecha
                    //? const registroMasReciente = resultados.reduce((latest, current) => {
                    //?    return new Date(current.Fecha) > new Date(latest.Fecha) ? current : latest;
                    //? });
                    
                    // Rellenar el formulario
                    //? rellenarFormulario(registroMasReciente);
                } else {
                    // No hay registros
                    mostrarMensaje("No se ha ingresado Serie Precio", "warning");
                }
            }
        };

        cursorRequest.onerror = (event) => {
            console.error('Error al buscar en SeriesPrecios:', event.target.error);
            mostrarMensaje(`Error al buscar serie de precio: ${event.target.error.message}`, "danger");
        };

    } catch (error) {
        console.error('Error en cargarSeriePrecio:', error);
        mostrarMensaje(`Error al procesar los datos: ${error.message}`, "danger");
    }
}
