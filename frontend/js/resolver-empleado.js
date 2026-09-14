(function (root) {
    function normalizarPersona(texto) {
        return String(texto || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function nombreCompleto(empleado) {
        return `${empleado.nombre || ''} ${empleado.apellido || ''}`.trim();
    }

    function resolverEmpleadoDeLista(empleados, dato) {
        const raw = String(dato || '').trim();
        if (!raw) {
            return { ok: false, status: 400, message: 'Falta código o nombre del empleado' };
        }

        const norm = normalizarPersona(raw);
        const activos = (empleados || []).filter(function (e) {
            if (!e) return false;
            if (e.activo === 0 || e.activo === false || e.activo === '0') return false;
            return true;
        });

        const porCodigo = activos.filter(function (e) {
            return normalizarPersona(e.codigo) === norm;
        });
        if (porCodigo.length === 1) {
            return { ok: true, empleado: porCodigo[0] };
        }

        const porNombreExacto = activos.filter(function (e) {
            const full = normalizarPersona(nombreCompleto(e));
            const invertido = normalizarPersona((e.apellido || '') + ' ' + (e.nombre || '')).trim();
            return full === norm || invertido === norm;
        });
        if (porNombreExacto.length === 1) {
            return { ok: true, empleado: porNombreExacto[0] };
        }
        if (porNombreExacto.length > 1) {
            return {
                ok: false,
                status: 409,
                message: 'Hay varios empleados con ese nombre. Selecciónalo de la lista.'
            };
        }

        const parciales = activos.filter(function (e) {
            const full = normalizarPersona(nombreCompleto(e));
            const codigo = normalizarPersona(e.codigo);
            const nombre = normalizarPersona(e.nombre);
            const apellido = normalizarPersona(e.apellido);
            return full.indexOf(norm) !== -1 || codigo === norm || nombre === norm || apellido === norm;
        });
        if (parciales.length === 1) {
            return { ok: true, empleado: parciales[0] };
        }
        if (parciales.length > 1) {
            return {
                ok: false,
                status: 409,
                message: 'Hay varias coincidencias. Selecciona a la persona de la lista.'
            };
        }

        return { ok: false, status: 404, message: 'Empleado no encontrado o inactivo' };
    }

    root.resolverEmpleadoDeLista = resolverEmpleadoDeLista;
    root.normalizarPersona = normalizarPersona;
})(window);
