# 🔒 Configurar HTTPS con ngrok (Más Sencillo)

## ngrok es la opción más rápida y sencilla

### Paso 1: Crear cuenta en ngrok
1. Ve a https://ngrok.com
2. Crea cuenta gratuita
3. Obtén tu authtoken

### Paso 2: En el Servidor
```bash
# Descargar ngrok
cd /root
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
mv ngrok /usr/local/bin/

# Configurar authtoken (el que te dio ngrok)
ngrok config add-authtoken TU_AUTHTOKEN

# Iniciar túnel
ngrok http 3000
```

### Paso 3: Usar la URL de ngrok
ngrok te dará una URL como: `https://abc123.ngrok-free.app`
Usa esa URL para acceder a la aplicación.

### Paso 4: Hacer que ngrok corra siempre
```bash
# Instalar screen
apt install -y screen

# Iniciar ngrok en screen
screen -S ngrok
ngrok http 3000
# Presiona Ctrl+A luego D para salir de screen

# Para ver ngrok después:
screen -r ngrok
```

---

## ✅ Ventajas de ngrok
- ✅ Gratis
- ✅ HTTPS automático
- ✅ Muy fácil de configurar
- ✅ Funciona en minutos

## ⚠️ Desventajas
- ⚠️ URL cambia cada vez (a menos que tengas plan de pago)
- ⚠️ Límite de conexiones en plan gratis

---

**¿Quieres que te guíe paso a paso con ngrok?**

