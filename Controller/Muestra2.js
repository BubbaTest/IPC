async function cargarSelect(storeName, selectElement, keyField, displayField, sortField, filterField = null, filterValue = null) {
    try {
        let query = db[storeName];
        if (filterField && filterValue) {
            query = query.where(filterField).equals(filterValue);
        }
        const items = await query.toArray(); // Obtener todos los elementos

        if (sortField) {
            items.sort((a, b) => (a[sortField] > b[sortField]) ? 1 : -1); // Ordenar manualmente
        }

        selectElement.innerHTML = ''; // Limpiar opciones existentes
        if (items.length > 0) {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = item[displayField];
                selectElement.appendChild(option);
            });
            selectElement.selectedIndex = -1; // Desseleccionar por defecto
        } else {
            selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
        }
        $(selectElement).trigger('change'); // Para Select2
    } catch (error) {
        console.error(`Error al cargar ${storeName}:`, error);
        selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
        $(selectElement).trigger('change');
    }
}

async function cargarSelect0(storeName, selectElement, keyField, displayField, sortField, filterField = null, filterValue = null) {
    try {
        let query = db[storeName];
        if (filterField && filterValue) {
            query = query.where(filterField).equals(filterValue);
        }
        const items = await query.sortBy(sortField);

        selectElement.innerHTML = ''; // Limpiar opciones existentes
        if (items.length > 0) {
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item[keyField];
                option.textContent = item[displayField];
                selectElement.appendChild(option);
            });
            selectElement.selectedIndex = -1; // Desseleccionar por defecto
        } else {
            selectElement.innerHTML = '<option value="">No hay datos disponibles</option>';
        }
        $(selectElement).trigger('change'); // Para Select2
    } catch (error) {
        console.error(`Error al cargar ${storeName}:`, error);
        selectElement.innerHTML = '<option value="">Error al cargar datos</option>';
        $(selectElement).trigger('change');
    }
}

async function filtrarMuestras(informanteId, variedadId) {
    try {
        let query = db.Muestra;
        if (informanteId) {
            query = query.where('InformanteId').equals(informanteId);
        }
        if (variedadId) {
            // Si ya hay un filtro por InformanteId, se añade el de VariedadId
            query = informanteId ? query.and(muestra => muestra.VariedadId === variedadId) : query.where('VariedadId').equals(variedadId);
        }

        const resultados = await query.toArray();
        const muestrasBody = document.getElementById('muestrasBody');
        const muestrasTable = document.getElementById('muestrasTable');
        const noDataMessage = document.getElementById('noDataMessage');

        document.getElementById('resultadosContainer').style.display = '';
        muestrasBody.innerHTML = '';
        muestrasTable.style.display = 'none';
        noDataMessage.style.display = 'none';

        if (resultados.length > 0) {
            resultados.forEach(muestra => {
                sMuestra = muestra; // Actualizar sMuestra global
                $("#analista").text(sMuestra.ObservacionAnalista);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${muestra.Especificacion || 'N/A'}</td>
                    <td>${muestra.Detalle || 'N/A'}</td>
                    <td>${muestra.EsPesable === true ? 'Si' : (muestra.EsPesable === false ? 'No' : 'N/A')}</td>
                    <td>${Number.parseInt(muestra.CantidadAnt, 10) || 'N/A'}</td>
                    <td>${Number.parseFloat(muestra.PrecioRecolectadoAnt || 0).toFixed(2)}</td>
                `;
                muestrasBody.appendChild(row);
            });
            muestrasTable.style.display = 'table';
            $("#resultadosContainer").show();
        } else {
            noDataMessage.style.display = 'block';
        }
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

async function filterAndPopulateInformantes() {
    const semanasSelect = document.getElementById('semanasSelect');
    const diasSelect = document.getElementById('diasSelect');
    const informantesSelect = document.getElementById('informantesSelect');

    const semanaKey = Number.parseInt(semanasSelect.value, 10);
    const diaValue = diasSelect.value;

    if (!semanaKey) {
        mostrarMensaje('Por favor seleccione una Semana.', "error");
        return;
    }
    if (!diaValue) {
        mostrarMensaje('Por favor seleccione un Día.', "error");
        return;
    }

    try {
        const filteredMuestra = await db.Muestra
            .where({ Semana: semanaKey, DiaSemanaId: diaValue })
            .toArray();

        const informanteIds = [...new Set(filteredMuestra.map(m => m.InformanteId))];

        const filteredInformantes = await db.Informantes
            .where('CodInformante').anyOf(informanteIds)
            .toArray();

        informantesSelect.innerHTML = '<option value="" disabled selected>Seleccione Informante</option>';
        if (filteredInformantes.length > 0) {
            filteredInformantes.forEach(({ CodInformante, NombreInformante }) => {
                const option = document.createElement('option');
                option.value = CodInformante;
                option.textContent = NombreInformante;
                informantesSelect.appendChild(option);
            });
        } else {
            informantesSelect.innerHTML = '<option value="" disabled>No hay informantes disponibles</option>';
        }
        $(informantesSelect).trigger('change');
    } catch (error) {
        console.error('Error al filtrar y popular informantes:', error);
        mostrarMensaje('Error al cargar informantes.', 'error');
    }
}

// Asignar la fecha actual al input de fecha y hora (sin cambios)
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
    $('#tipomonedaSelect').select2("val", "ca");
    $('#pesoInput').prop("disabled", true); 
    $('#pesoInput').val("0");
    $('#preciosustituidoInput').prop("disabled", true); 
    $('#preciosustituidoInput').val("0");
    $('#nvecesInput').prop("disabled", true);
    $('#nvecesInput').val("0");
    $('#ofertachk input[type=checkbox]').prop("checked", false);
    $('#descuentochk input[type=checkbox]').prop("checked", false);
    $('#porcentajedescuentoInput').prop("disabled", true);
    $('#porcentajedescuentoInput').val("0");
    $('#ivachk input[type=checkbox]').prop("checked", false);
    //$('#propinano').prop('checked', true); // Comentado ya que el comportamiento por defecto es no marcado
    $(".schk").prop("disabled", true);
    $('#observacionesInput').val("");
}

async function insertarSeriePrecio() {
    try {
        const semanaSelect = document.getElementById('semanasSelect');
        const diasSelect = document.getElementById('diasSelect');
        const informanteSelect = document.getElementById('informantesSelect');
        const variedadesSelect = document.getElementById('variedadesSelect');
        const resultadoSelect = document.getElementById('resultadoSelect');
        const estadoSelect = document.getElementById('estadoSelect');
        // sMuestra se asume que está disponible globalmente y contiene el registro de Muestra actual
        const fechaaInput = sMuestra.Fecha; 
        const precioaInput = sMuestra.PrecioRecolectadoAnt;
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
        const fechaInput = document.getElementById('fechaInput') || { value: new Date().toISOString().split('T')[0] }; // Fecha de creación del registro
        const usuarioInput = document.getElementById('hidden-usuarioId');

        if (!informanteSelect || !variedadesSelect) {
            throw new Error('Faltan elementos del formulario requeridos');
        }

        var peso;
        const semana = validarNumero(semanaSelect.value, 'Semana', true);
        const dia = validarCampoTexto(diasSelect.value);
        const informanteId = validarCampoTexto(informanteSelect.value, 'Informante');
        const variedadId = validarCampoTexto(variedadesSelect.value, 'Variedad');
        const fecha = validarFecha(fechaInput.value.trim(), 'Fecha de Creación');
        const resultado = validarNumero(resultadoSelect?.value, 'Resultado', true);
        const estado = validarNumero(estadoSelect?.value, 'Estado', true);
        const fechaa = fechaaInput; // Fecha de la muestra original
        const precioa = Number.parseFloat(precioaInput); // Precio anterior de la muestra original
        const espesable = espesableInput; // Si es pesable de la muestra original
        const anio = Number.parseInt(anioInput.value, 10);
        const mes = Number.parseInt(mesInput.value, 10);
        const muestraid = validarCampoTexto(muestraidInput, 'ID Muestra');
        const cantidad = validarNumero(cantidadInput?.value, 'Cantidad', true);
        const precio = validarNumero(precioInput?.value, 'Precio Recolectado', true);
        const undm = validarCampoTexto(undmSelect?.value, 'Unidad de medida');
        const tipomoneda = validarNumero(tipomonedaSelect?.value, 'Tipo de moneda', true);
        if (estado === 4) { // Asumiendo que 4 es un estado que requiere peso
            peso = validarNumero(pesoInput?.value, 'Peso', false); // false indica que no es requerido si el estado no es 4
        } else {
            peso = null;
        }
        const preciosustituido = validarNumero(preciosustituidoInput?.value, 'Precio sustituido', false);
        const nveces = validarNumero(nvecesInput?.value, 'Número de veces', false);
        const porcentajedescuento = validarNumero(porcentajedescuentoInput?.value, 'Porcentaje de descuento', false);
        const observaciones = observacionesInput?.value.trim() || '';
        const usuario = validarCampoTexto(usuarioInput?.value, 'Usuario');

        let oferta = null;
        let descuento = null;
        let iva = null;
        let propina = null;

        const ofertaCheck = $("#ofertachk input[type='checkbox']");
        if (estadoSelect.value == 4 && (Array.from(ofertaCheck).length === 0 || !Array.from(ofertaCheck).some(cb => $(cb).prop('checked')))) {
            throw new Error("Debe seleccionar al menos una opción para 'Oferta' cuando el estado es Ninguno.");
        }
        ofertaCheck.each(function() { if ($(this).prop('checked')) oferta = validarBoolean(this.value, 'Oferta'); });
        
        const descuentoCheck = $("#descuentochk input[type='checkbox']");
        if (estadoSelect.value == 4 && (Array.from(descuentoCheck).length === 0 || !Array.from(descuentoCheck).some(cb => $(cb).prop('checked')))) {
            throw new Error("Debe seleccionar al menos una opción para 'Descuento' cuando el estado es Ninguno.");
        }
        descuentoCheck.each(function() { if ($(this).prop('checked')) descuento = validarBoolean(this.value, 'Descuento'); });

        const ivaCheck = $("#ivachk input[type='checkbox']");
        if (estadoSelect.value == 4 && (Array.from(ivaCheck).length === 0 || !Array.from(ivaCheck).some(cb => $(cb).prop('checked')))) {
            throw new Error("Debe seleccionar al menos una opción para 'IVA' cuando el estado es Ninguno.");
        }
        ivaCheck.each(function() { if ($(this).prop('checked')) iva = validarBoolean(this.value, 'IVA'); });

        const propinaCheck = $("#propinachk input[type='checkbox']");
        if (estadoSelect.value == 4 && (Array.from(propinaCheck).length === 0 || !Array.from(propinaCheck).some(cb => $(cb).prop('checked')))) {
            throw new Error("Debe seleccionar al menos una opción para 'Propina' cuando el estado es Ninguno.");
        }
        propinaCheck.each(function() { if ($(this).prop('checked')) propina = validarBoolean(this.value, 'Propina'); });


        const seriePrecio = {
            InformanteId: informanteId,
            VariedadId: variedadId,
            Anio: anio,
            Mes: mes,
            Dia: dia, // Asegúrate que 'dia' se esté obteniendo correctamente si es necesario.
            muestraid: muestraid,
            Semana: semana,
            Fecha: fechaa, 
            PrecioRecolectado: precio,
            PrecioAnterior: precioa,
            EsPesable: espesable,
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
            PrecioSustituidoC: 0, // Valor por defecto o lógica específica
            ObservacionEnumerador: observaciones,
            FechaCreacion: fecha, 
            CreadoPor: usuario,
            Resultado: resultado,
            Nveces: nveces,
            Enviado: false, // Por defecto no enviado
            CoordenadaX: Number.parseFloat($("#lblLongitud").val()) || null, // Manejar NaN
            CoordenadaY: Number.parseFloat($("#lblLatitud").val()) || null  // Manejar NaN
        };

        await db.SeriesPrecios.put(seriePrecio);

        console.log('Registro insertado/actualizado:', seriePrecio);
        mostrarMensaje('Registro guardado exitosamente', 'success');
        alertify.set('notifier', 'position', 'bottom-center');
        alertify.success('Registro guardado exitosamente');

        return {
            success: true,
            message: 'Registro guardado exitosamente',
            data: seriePrecio
        };

    } catch (error) {
        console.error('Error en insertarSeriePrecio:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
        alertify.set('notifier', 'position', 'bottom-center');
        alertify.error(`Error al guardar: ${error.message}`);
        return {
            success: false,
            message: error.message
        };
    }
}

async function InsertarRegistroNoRealizado() {
    try {
        const informanteSelect = document.getElementById('informantesSelect');
        const informanteId = validarCampoTexto(informanteSelect.value, 'Informante');

        // Obtener todas las VariedadId asociadas al InformanteId en "Muestra"
        const registrosMuestra = await db.Muestra.where('InformanteId').equals(informanteId).toArray();

        if (registrosMuestra.length === 0) {
            throw new Error("No se encontraron registros en Muestra para este Informante.");
        }
        
        // Eliminar duplicados basados en VariedadId y obtener la información necesaria
        const variedadesUnicasMap = new Map();
        registrosMuestra.forEach(registro => {
            if (!variedadesUnicasMap.has(registro.VariedadId)) {
                variedadesUnicasMap.set(registro.VariedadId, {
                    VariedadId: registro.VariedadId,
                    Fecha: registro.Fecha, // Fecha original de la muestra
                    muestraid: registro.muestraid,
                    PrecioRecolectadoAnt: registro.PrecioRecolectadoAnt,
                    EsPesable: registro.EsPesable,
                    Nveces: registro.Nveces
                });
            }
        });
        const variedadesUnicas = Array.from(variedadesUnicasMap.values());

        // Configuración común desde formulario
        const semanaSelect = document.getElementById('semanasSelect');
        const diasSelect = document.getElementById('diasSelect');
        const fechaInput = document.getElementById('fechaInput') || { value: new Date().toISOString().split('T')[0] }; // Fecha de creación del registro
        const usuarioInput = document.getElementById('hidden-usuarioId');

        const semana = Number.parseInt(semanaSelect.value);
        const dia = validarCampoTexto(diasSelect.value); // Día de la semana de la recolección
        const anio = Number.parseInt(document.getElementById('anio').value, 10);
        const mes = Number.parseInt(document.getElementById('mes').value, 10);
        const cantidad = 1; // Cantidad por defecto para no realizado
        const precio = 0;   // Precio por defecto para no realizado
        const undm = null;
        const tipomoneda = null;
        const peso = null;
        const preciosustituido = null;
        const porcentajedescuento = null;
        const observaciones = 'No realizado'; // Observación por defecto
        const usuario = validarCampoTexto(usuarioInput?.value, 'Usuario');
        const oferta = null; 
        const descuento = null;
        const iva = null;
        const propina = null;
        const fechaCreacion = validarFecha(fechaInput.value.trim(), 'Fecha de Creación'); // Fecha de creación del registro
        const resultado = 2; // Código para "No realizado"
        const estado = 0;    // Estado por defecto para no realizado

        const seriesPreciosToAdd = variedadesUnicas.map(registro => ({
            InformanteId: informanteId,
            VariedadId: registro.VariedadId,
            Anio: anio,
            Mes: mes,
            Dia: dia, 
            muestraid: registro.muestraid,
            Semana: semana,
            Fecha: registro.Fecha, // Fecha original de la muestra
            PrecioRecolectado: precio,
            PrecioAnterior: Number.parseFloat(registro.PrecioRecolectadoAnt),
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
            FechaCreacion: fechaCreacion, // Fecha de creación del registro
            CreadoPor: usuario,
            Resultado: resultado,
            Nveces: Number.parseInt(registro.Nveces) + 1, // Incrementar Nveces
            Enviado: false, // Por defecto no enviado
            CoordenadaX: Number.parseFloat($("#lblLongitud").val()) || null,
            CoordenadaY: Number.parseFloat($("#lblLatitud").val()) || null
        }));

        await db.SeriesPrecios.bulkPut(seriesPreciosToAdd);

        mostrarMensaje('Registros (No Realizado) guardados exitosamente', 'success');
        alertify.set('notifier', 'position', 'bottom-center');
        alertify.success('Registros (No Realizado) guardados exitosamente');
        return {
            success: true,
            message: `Se insertaron ${variedadesUnicas.length} registros (No Realizado).`,
        };

    } catch (error) {
        console.error('Error en InsertarRegistroNoRealizado:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
        alertify.set('notifier', 'position', 'bottom-center');
        alertify.error(`Error: ${error.message}`);
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

function validarNumero(valor, nombreCampo, esRequerido = false) {
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
        //const store = transaction.objectStore('SeriesPrecios');

        // ✅ Usar Dexie para buscar el registro
        const resultado = await db.SeriesPrecios
            .where({ InformanteId: cleanInformante, VariedadId: cleanVariedad, Semana: cleanSemana })
            .first(); // Obtener el primer registro que coincida (o undefined)

        if (resultado) {
            rellenarFormulario(resultado);
        } else {
            limpiarVariedadDetalle("editar");
            mostrarMensaje("No se ha ingresado Serie Precio", "warning");
        }

    } catch (error) {
        console.error('Error en cargarSeriePrecio:', error);
        mostrarMensaje(`Error al procesar los datos: ${error.message}`, 'error');
    }
}

// Función auxiliar para rellenar checkbox (sin cambios)
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
}

async function getInformanteDetalle(codInformante, semana) {
    try {
        const registro = await db.InformanteDetalle.get([String(codInformante), Number.parseInt(semana)]);

        if (registro) {
            document.getElementById('direccionInput').value = registro.Direccion || '';
            document.getElementById('regionInput').value = registro.Region || '';
            document.getElementById('cvariedadesInput').value = registro.Cantidad || '';
            return registro;
        } else {
            console.warn('No se encontró ningún registro con la clave:', [String(codInformante), Number.parseInt(semana)]);
            document.getElementById('direccionInput').value = '';
            document.getElementById('regionInput').value = '';
            document.getElementById('cvariedadesInput').value = '';
            return null;
        }
    } catch (error) {
        console.error('Error al buscar el registro:', error);
        throw error; // Re-lanzar el error para que pueda ser manejado por el llamador
    }
}

// Función para rellenar el formulario con los datos encontrados (sin cambios en su lógica interna, pero ahora usa el resultado de getInformanteDetalle con Dexie)
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
        const muestraCount = await db.Muestra.where('InformanteId').equals(cleanId).count();
        
        // Contar registros en SeriesPrecios
        const seriesCount = await db.SeriesPrecios.where('InformanteId').equals(cleanId).count();
        
        // Comparar resultados (sin cambios)
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
        const muestras = await db.Muestra
            .where({ InformanteId: String(informanteId), Semana: Number.parseInt(semana) })
            .toArray();

        if (muestras.length === 0) {
            console.warn('No se encontraron registros en Muestra para la combinación Informante y Semana');
            mostrarListadoFaltantes([], new Map()); // Mostrar modal vacío
            return;
        }

        const muestraMap = new Map();
        muestras.forEach(registro => {
            muestraMap.set(registro.VariedadId, registro.Descripcion);
        });

        // 2. Obtener todas las variedades ya registradas en SeriesPrecios para ese informante
        const seriesRegistradas = await db.SeriesPrecios
            .where('InformanteId').equals(String(informanteId))
            .toArray();

        const seriesSet = new Set();
        seriesRegistradas.forEach(registro => {
            if (registro.VariedadId) seriesSet.add(registro.VariedadId.trim());
        });
        
        // 3. Encontrar las faltantes comparando con Muestra
        const faltantes = [...muestraMap.keys()].filter(id => !seriesSet.has(id.trim()));
        
        // 4. Mostrar listado de faltantes
        mostrarListadoFaltantes(faltantes, muestraMap);

    } catch (error) {
        console.error('Error al mostrar diferencias:', error);
        mostrarMensaje(`Error al comparar registros: ${error.message}`, 'error');
    }
}

async function marcarInformantesConDatosHoy() {
    const db = await IniciarBaseDatos();
    const informantesSelect = $('#informantesSelect'); // Usamos jQuery para select2

    // Obtener fecha de hoy en formato ISO
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const fechaInicio = hoyStr + 'T00:00:00.000Z'; // Asegurar formato ISO completo para Dexie
    const fechaFin = hoyStr + 'T23:59:59.999Z';   // Asegurar formato ISO completo para Dexie

    const informantesHoy = new Set();

    try {
        const registrosHoy = await db.SeriesPrecios
            .where('FechaCreacion').between(fechaInicio, fechaFin, true, true) // true, true para incluir límites
            .toArray();

        registrosHoy.forEach(registro => {
            if (registro.InformanteId !== undefined) {
                informantesHoy.add(registro.InformanteId);
            }
        });

        inicializarSelect2ConMarcacion(informantesSelect, informantesHoy);

    } catch (error) {
        console.error("Error al leer los datos de SeriesPrecios:", error);
    }
}

// Función que inicializa select2 con templateResult para marcar opciones (sin cambios)
function inicializarSelect2ConMarcacion(selectElement, informantesHoySet) {
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
            if (informantesHoySet.has(option.id)) {
                $option.addClass('informante-datos-hoy');
                $option.attr('title', 'Este informante tiene datos hoy');
            }
            return $option;
        },
        // También manejamos templateSelection para título al mostrar selección
        templateSelection: function(option) {
            if (!option.id) {
                return option.text;
            }
            let $selection = $('<span></span>').text(option.text);
            if (informantesHoySet.has(option.id)) {
                $selection.attr('title', 'Este informante tiene datos hoy');
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
        const registrosNoEnviados = response.SeriesPrecios_; // Extraemos los registros no enviados
        if (registrosNoEnviados.length === 0) {           
            mostrarMensaje("No hay registros pendientes por enviar", "success");
            return;
        }

        const jsonData = JSON.stringify(response); // Convertir a JSON
        //console.error("Datos a enviar:", jsonData);

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
            let query = db.SeriesPrecios.where('Enviado').equals(false).and(item => item.EsPesable === obj);

            // Condición adicional para pesables
            if (obj === true) {
                query = query.and(item => item.Peso === null || item.Peso > 0);
            }

            const registrosNoEnviados = await query.toArray();

            // Mapeo de SeriesPrecios_ (sin cambios en la lógica de mapeo)
            const SeriesPrecios_ = registrosNoEnviados.map(item => ({
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
                        CoordenadaY: item.CoordenadaY
                    });
                }
            });

            const Informantes = Array.from(informantesMap.values());

            // Resolución del resultado
            resolve({
                SeriesPrecios_: SeriesPrecios_,
                Muestras: Muestras,
                Informantes: Informantes
            });
            //};

            request.onerror = () => {
                reject("Error al obtener los registros de SeriesPrecios");
            };
        //});
    } catch (error) {
        console.error("Error al abrir la base de datos:", error);
        throw error;
    }
}

// openDB ya no es necesaria con Dexie, db es global en BaseDatos.js

async function marcarComoEnviados(registros) {
    try {
        const keysToUpdate = registros.map(r => [r.InformanteId, r.VariedadId, r.Fecha]);
        
        // Obtener los registros actuales que necesitan ser actualizados
        const itemsToUpdate = await db.SeriesPrecios.bulkGet(keysToUpdate);

        const updatedItems = [];
        itemsToUpdate.forEach(item => {
            if (item && item.Enviado === false) {
                item.Enviado = true;
                updatedItems.push(item);
            }
        });
        
        if (updatedItems.length > 0) {
            await db.SeriesPrecios.bulkPut(updatedItems);
        }
        console.log(`${updatedItems.length} registros marcados como enviados.`);

    } catch (error) {
        console.error("Error al actualizar los registros:", error);
        throw new Error(`Error al marcar como enviados: ${error.message}`); // Re-lanzar para manejo externo
    }
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

        // Mostrar modal con los resultados (la lógica del modal no cambia)
        mostrarModalResultados(catalog, 'Informantes con Variedades Faltantes', 
            item => `<span><strong>${item.nombreInformante}</strong></span>
                     <button class="btn btn-sm btn-primary" onclick="irMuestra(${item.semana}, '${item.diaSemanaId}', '${item.codInformante.trim()}')">Ver</button>`,
            '¡No hay informantes con variedades faltantes!'
        );

        return {
            success: true,
            message: `Informantes con variedades faltantes: ${catalog.length}`,
            data: catalog
        };

    } catch (error) {
        console.error("Error al validar muestras:", error);
        mostrarModalErrores(`Error al obtener los datos: ${error.message}`);
        return {
            success: false,
            message: error.message,
            data: []
        };
    }
}

async function mostrarPesableFaltante() {
    try {
        const records = await db.SeriesPrecios
            .where('EsPesable').equals(true)
            .and(item => item.Enviado === false && (item.Peso === null || item.Peso === 0))
            .toArray();

        if (!records.length) {
            mostrarModalResultados([], 'Sin Registros Pesables Faltantes', null, '¡No hay informantes con pesables faltantes!');
            return {
                success: true,
                message: "No hay registros con pesables faltantes"
            };
        }

        const resultadoPromises = records.map(async (record) => {
            const informante = await db.Informantes.get(record.InformanteId); // Asumiendo que la clave es solo CodInformante o que está bien así para este get
            const variedad = await db.Variedades.get([String(record.VariedadId), String(record.InformanteId)]);
            if (informante && variedad) {
                return {
                    NombreInformante: informante.NombreInformante,
                    Descripcion: variedad.Descripcion,
                    Semana: record.Semana,
                    Dia: record.Dia,
                    InformanteId: record.InformanteId
                };
            }
            return null;
        });

        const resultado = (await Promise.all(resultadoPromises)).filter(item => item !== null);
        
        mostrarModalResultados(resultado, 'Informantes con Pesables Faltantes',
            item => `<span><strong>${item.NombreInformante} - ${item.Descripcion}</strong></span>
                     <button class="btn btn-sm btn-primary" onclick="irMuestra(${item.Semana}, '${item.Dia}', '${item.InformanteId.trim()}')">Ver</button>`
        );

        return {
            success: true,
            message: `Informantes con pesables faltantes: ${resultado.length}`,
            data: resultado
        };

    } catch (error) {
        console.error("Error en mostrarPesableFaltante:", error);
        mostrarModalErrores(`Error al procesar datos: ${error.message}`);
        return {
            success: false,
            message: `Error al procesar datos: ${error.message}`
        };
    }
}


// Función genérica para mostrar resultados en el modal
function mostrarModalResultados(data, title, itemRenderer, noDataMessageContent) {
    const modalBody = document.getElementById("modalFaltantesBody");
    const modalTitle = document.getElementById("modalFaltantesLabel");

    modalTitle.textContent = title;

    if (data.length === 0) {
        modalBody.innerHTML = `<div class="alert alert-success text-center" role="alert">${noDataMessageContent}</div>`;
    } else {
        const listGroup = document.createElement("ul");
        listGroup.className = "list-group list-group-flush";
        data.forEach(item => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            if (itemRenderer) {
                li.innerHTML = itemRenderer(item);
            } else {
                 li.innerHTML = `<span><strong>${item.NombreInformante} - ${item.Descripcion}</strong></span>`;
            }
            listGroup.appendChild(li);
        });
        modalBody.innerHTML = "";
        modalBody.appendChild(listGroup);
    }
    const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
    bsModal.show();
}

// Función para mostrar errores en el modal
function mostrarModalErrores(errorMessage) {
    const modalBody = document.getElementById("modalFaltantesBody");
    const modalTitle = document.getElementById("modalFaltantesLabel");
    modalTitle.textContent = "Error";
    modalBody.innerHTML = `<div class="alert alert-danger text-center" role="alert">${errorMessage}</div>`;
    const bsModal = new bootstrap.Modal(document.getElementById("modalFaltantes"));
    bsModal.show();
}


function mostrarModal(resultado) { // Esta función es ahora reemplazada por mostrarModalResultados y mostrarModalErrores
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
        document.getElementById('variedadDetalle').style.display = 'block';
    });                        

    document.getElementById('limpiarBtn').addEventListener('click', () => {
        limpiarVariedadDetalle("nuevo"); 
    });

    document.getElementById('guardarBtn').addEventListener('click', () => {
        insertarSeriePrecio()
        .then(resultado => {
            if (!resultado.success) {
                marcarInformantesConDatosHoy();
                mostrarMensaje(`Error: ${resultado.message}`, 'error');
            } 
            else {
                // Limpiar formulario después de guardar
                limpiarVariedadDetalle("nuevo");
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
         $('#resultadoSelect').select2("val", "ca");
         $("#resultadoSelect").prop("disabled", true);

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
        const estadoId = $(this).val();
        if (estadoId==1) {
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
        } else {
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
        filtrarMuestras(informanteId, variedadId);

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

// Función para obtener una muestra por ID
async function getMuestraById(id) {
        return await db.Muestra.get(id);
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
        const idNumerico = Number(id); // Asegurarse que el ID es un número si la clave primaria es numérica

        // Obtener el registro actual
        const registroActual = await db.Muestra.get(idNumerico);

        if (!registroActual) {
            alert('No se encontró el registro para actualizar');
            return;
        }

        // Actualizar solo los campos editables
        const actualizacion = {
            detalle: detalle,
            sem1: sem1, // Asegúrate que el tipo de dato coincida con el esquema
            nveces: nveces, // Asegúrate que el tipo de dato coincida con el esquema
            usuario: usuario,
            lng: lng,
            lat: lat
        };

        await db.Muestra.update(idNumerico, actualizacion);
        
        mostrarMensaje('Muestra actualizada correctamente', "success");
        
        // Refrescar la tabla con los mismos filtros
        detalleDiv.innerHTML = '';
        const informanteId = document.getElementById('informantesSelect').value;
        const variedadId = document.getElementById('variedadesSelect').value;
        filtrarMuestras(informanteId, variedadId);
        
    } catch (error) {
        console.error('Error al actualizar la muestra:', error);
        alert('Ocurrió un error al guardar los cambios');
    }
}

async function actualizarNveces() {
    const informanteId = "11-1000016";
    const variedadId = "011420403";
    const fecha = "2025-05-06T00:00:00"; 

    try {
        const updatedCount = await db.SeriesPrecios
            .where({ InformanteId: informanteId, VariedadId: variedadId, Fecha: fecha })
            .modify({ Enviado: false }); // También puedes resetear Nveces aquí si es necesario: Nveces: 0

        if (updatedCount > 0) {
            console.log(`${updatedCount} registro(s) actualizado(s) exitosamente.`);
        } else {
            console.log("Registro no encontrado o ya estaba actualizado.");
        }
    } catch (error) {
        console.error("Error al actualizar el registro:", error);
    }
}

async function actualizarNveces2() { // Asumo que esta función es para poner todos los 'Enviado' a false
    try {
        const updatedCount = await db.SeriesPrecios.toCollection().modify({ Enviado: false });
        console.log(`Todos los ${updatedCount} registros de SeriesPrecios actualizados (Enviado = false).`);
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
