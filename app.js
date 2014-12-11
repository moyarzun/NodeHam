var express = require("express"), 
http = require("http"),
app = express(),
server = http.createServer(app),
path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.set("views",__dirname + "/views");
app.configure(function(){
	app.use(express.static(__dirname));
});

app.get("/", function(req,res){
	res.render("index.jade", {title : "NodeHam - Chat con seguridad Needham-Schroeder"});
});

server.listen(3000);

//objecto para guardar en la sesión del socket a los que se vayan conectando
var usuariosOnline = {};
var passwordsOnline = {};

var io = require("socket.io").listen(server);

//al conectar un usuario||socket, este evento viene predefinido por socketio
io.sockets.on('connection', function(socket) 
{
	//cuando el usuario conecta al chat comprobamos si está logueado
	//el parámetro es la sesión login almacenada con sessionStorage
	socket.on("loginUser", function(username, password)
	{
		//si existe el nombre de usuario en el chat
		if(usuariosOnline[username])
		{
			socket.emit("userInUse");
			return;
		}
		//Guardamos el nombre de usuario en la sesión del socket para este cliente
		socket.username = username;
		socket.password = password;
		//añadimos al usuario a la lista global donde almacenamos usuarios
		usuariosOnline[username] = socket.username;
		passwordsOnline[username] = socket.password;
		//mostramos al cliente como que se ha conectado
		socket.emit("refreshChat", "yo", "Bienvenido " + socket.username + ", te has conectado correctamente - Contraseña: " + socket.password);
		//mostramos de forma global a todos los usuarios que un usuario
		//se acaba de conectar al chat
		socket.broadcast.emit("refreshChat", "conectado", "El usuario " + socket.username + " se ha conectado al chat.");
		//actualizamos la lista de usuarios en el chat del lado del cliente
		io.sockets.emit("updateSidebarUsers", usuariosOnline);
	});

	//cuando un usuario envia un nuevo mensaje, el parámetro es el 
	//mensaje que ha escrito en la caja de texto
	socket.on('addNewMessage', function(message) 
	{
		//pasamos un parámetro, que es el mensaje que ha escrito en el chat, 
		//ésto lo hacemos cuando el usuario pulsa el botón de enviar un nuevo mensaje al chat
		//con socket.emit, el mensaje es para mi
		socket.emit("refreshChat", "msg", "Yo : " + message);
		//con socket.broadcast.emit, es para el resto de usuarios
		socket.broadcast.emit("refreshChat", "msg", socket.username + " dice: " + message);
	});

//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################

	socket.on('handshake', function(action, datos)
	{
		//Paso 2 de handshake - SERVIDOR
		if(action == "1"){
	        if(!usuariosOnline[datos.receptor])
	        {
	            socket.emit("refreshChat", "yo", datos.emisor + " - ERROR: Usuario '" + datos.receptor + "' no está conectado.");
	        }else{
	        	var claveSesion = Math.floor(Math.random() * 100000);
	        	var cryptoM = encDes(datos.nonce + "!!" + claveSesion + "**" + datos.receptor + "@@" + encDes(claveSesion + "||" + datos.emisor, passwordsOnline[datos.receptor], 0), passwordsOnline[socket.username], 0);
		        socket.emit("handshake", "2", cryptoM);
	        }
    	}else if(action == "3"){
    		socket.broadcast.emit("handshake", "3", datos);
    	}else if(action == "4"){
    		socket.broadcast.emit("handshake", "4", datos);
    	}else if(action == "5"){
    		socket.broadcast.emit("handshake", "5", datos);
    	}else if(action == "6"){
    		socket.broadcast.emit("handshake", "6", datos);
    	}else if(action == "7"){
    		socket.broadcast.emit("refreshChat", "crypt", datos); 
    	}
	});

//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################


	//cuando el usuario cierra o actualiza el navegador
	socket.on("disconnect", function()
	{
		//si el usuario, por ejemplo, sin estar logueado refresca la
		//página, el typeof del socket username es undefined, y el mensaje sería 
		//El usuario undefined se ha desconectado del chat, con ésto lo evitamos
		if(typeof(socket.username) == "undefined")
		{
			return;
		}
		//en otro caso, eliminamos al usuario
		delete usuariosOnline[socket.username];
		//actualizamos la lista de usuarios en el chat, zona cliente
		io.sockets.emit("updateSidebarUsers", usuariosOnline);
		//emitimos el mensaje global a todos los que están conectados con broadcasts
		socket.broadcast.emit("refreshChat", "desconectado", "El usuario " + socket.username + " se ha desconectado del chat.");
	});
});

//Basado en el algoritmo de Paul Tero creado en Julio del 2001 en Reino Unido (http://www.tero.co.uk/des/)
//Agradecemos a Paul por su aporte en el rendimiento

function crearLlaves(clave){
		//Creamos estos arreglos para acelerar un poco las cosas
	pc2bytes0  = [0,0x4,0x20000000,0x20000004,0x10000,0x10004,0x20010000,0x20010004,0x200,0x204,0x20000200,0x20000204,0x10200,0x10204,0x20010200,0x20010204];
	pc2bytes1  = [0,0x1,0x100000,0x100001,0x4000000,0x4000001,0x4100000,0x4100001,0x100,0x101,0x100100,0x100101,0x4000100,0x4000101,0x4100100,0x4100101];
	pc2bytes2  = [0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808,0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808];
	pc2bytes3  = [0,0x200000,0x8000000,0x8200000,0x2000,0x202000,0x8002000,0x8202000,0x20000,0x220000,0x8020000,0x8220000,0x22000,0x222000,0x8022000,0x8222000];
	pc2bytes4  = [0,0x40000,0x10,0x40010,0,0x40000,0x10,0x40010,0x1000,0x41000,0x1010,0x41010,0x1000,0x41000,0x1010,0x41010];
	pc2bytes5  = [0,0x400,0x20,0x420,0,0x400,0x20,0x420,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420];
	pc2bytes6  = [0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002,0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002];
	pc2bytes7  = [0,0x10000,0x800,0x10800,0x20000000,0x20010000,0x20000800,0x20010800,0x20000,0x30000,0x20800,0x30800,0x20020000,0x20030000,0x20020800,0x20030800];
	pc2bytes8  = [0,0x40000,0,0x40000,0x2,0x40002,0x2,0x40002,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002];
	pc2bytes9  = [0,0x10000000,0x8,0x10000008,0,0x10000000,0x8,0x10000008,0x400,0x10000400,0x408,0x10000408,0x400,0x10000400,0x408,0x10000408];
	pc2bytes10 = [0,0x20,0,0x20,0x100000,0x100020,0x100000,0x100020,0x2000,0x2020,0x2000,0x2020,0x102000,0x102020,0x102000,0x102020];
	pc2bytes11 = [0,0x1000000,0x200,0x1000200,0x200000,0x1200000,0x200200,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200];
	pc2bytes12 = [0,0x1000,0x8000000,0x8001000,0x80000,0x81000,0x8080000,0x8081000,0x10,0x1010,0x8000010,0x8001010,0x80010,0x81010,0x8080010,0x8081010];
	pc2bytes13 = [0,0x4,0x100,0x104,0,0x4,0x100,0x104,0x1,0x5,0x101,0x105,0x1,0x5,0x101,0x105];

	//Areglo para guardar las claves
	var claves = new Array(32);

	//Ahora definimos los cambios que necesitamos hacer a la izquierda
	var shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];

	//Luego otras variables
	var leftTemp,
		rightTemp,
		m = 0,
		n = 0,
		temp;

	//Ahora a picar	
	//Primero obtengamos el UNICODE de la clave. Con esto resultarán dos enteros que usaremos con los operadores
	//bitwise de javascript
	left = (clave.charCodeAt(m++) << 24) | (clave.charCodeAt(m++) << 16) | (clave.charCodeAt(m++) << 8) | clave.charCodeAt(m++);
	right = (clave.charCodeAt(m++) << 24) | (clave.charCodeAt(m++) << 16) | (clave.charCodeAt(m++) << 8) | clave.charCodeAt(m++);
	
	//Ahora realizamos la primera permutación (PC1)
	temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);
    temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
    temp = ((left >>> 2) ^ right) & 0x33333333; right ^= temp; left ^= (temp << 2);
    temp = ((right >>> -16) ^ left) & 0x0000ffff; left ^= temp; right ^= (temp << -16);
    temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
    temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
    temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);    

    //El lado derecho necesita cambiar y obtener los últimos cuatro bits del lado izquierdo
    temp = (left << 8) | ((right >>> 20) & 0x000000f0);
    //Y el lado derecho tiene que darse vuelta
    left = (right << 24) | ((right << 8) & 0xff0000) | ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0);
    //Y dejamos el lado derecho listo
    right = temp;


    //Ahora vamos a ir creando las llaves y guadandolas en el arreglo de las llaves
    for (var i=0; i < shifts.length; i++) {
    	//Hay que cambiar las claves uno o dos bits a la izquierda
    	if (shifts[i]) {
    		left = (left << 2) | (left >>> 26); right = (right << 2) | (right >>> 26);
		}else {
			left = (left << 1) | (left >>> 27); right = (right << 1) | (right >>> 27);
		}
		left &= -0xf;
		right &= -0xf;

		//Ahora aplicamos las segundas permutaciones. De aqui saldrán 16 claves de 56 bits en vez de 48.
		//¿La razón? Cuando encriptemos sólo usaremos 4 de 6 bits de cada bloque para proveerle el poder de encriptación
		//que posee DES y facilitar las cosas 
		lefttemp = pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf] | 
			pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf] |
			pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf] |
			pc2bytes6[(left >>> 4) & 0xf];
	    righttemp = pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf] |
	    	pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf] |
	    	pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf] |
	    	pc2bytes13[(right >>> 4) & 0xf];
    	temp = ((righttemp >>> 16) ^ lefttemp) & 0x0000ffff;

    	claves[n++] = lefttemp ^ temp;
    	var x = lefttemp ^ temp;

    	claves[n++] = righttemp ^ (temp << 16);
    	x = righttemp ^ (temp << 16);
    }
    return claves;
};



function encDes(tPlano, clave, encOrDenc){

	var opcion = (encOrDenc) ? 'codificar':'decodificar';

	//Declaramos estos arreglos para acelerar las cosas. Servirán para las cajas S
	var spfunction1 = [0x1010400,0,0x10000,0x1010404,0x1010004,0x10404,0x4,0x10000,0x400,0x1010400,0x1010404,0x400,0x1000404,0x1010004,0x1000000,0x4,0x404,0x1000400,0x1000400,0x10400,0x10400,0x1010000,0x1010000,0x1000404,0x10004,0x1000004,0x1000004,0x10004,0,0x404,0x10404,0x1000000,0x10000,0x1010404,0x4,0x1010000,0x1010400,0x1000000,0x1000000,0x400,0x1010004,0x10000,0x10400,0x1000004,0x400,0x4,0x1000404,0x10404,0x1010404,0x10004,0x1010000,0x1000404,0x1000004,0x404,0x10404,0x1010400,0x404,0x1000400,0x1000400,0,0x10004,0x10400,0,0x1010004];
	var spfunction2 = [-0x7fef7fe0,-0x7fff8000,0x8000,0x108020,0x100000,0x20,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,0x100000,0x20,-0x7fefffe0,0x108000,0x100020,-0x7fff7fe0,0,-0x80000000,0x8000,0x108020,-0x7ff00000,0x100020,-0x7fffffe0,0,0x108000,0x8020,-0x7fef8000,-0x7ff00000,0x8020,0,0x108020,-0x7fefffe0,0x100000,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,0x8000,-0x7ff00000,-0x7fff8000,0x20,-0x7fef7fe0,0x108020,0x20,0x8000,-0x80000000,0x8020,-0x7fef8000,0x100000,-0x7fffffe0,0x100020,-0x7fff7fe0,-0x7fffffe0,0x100020,0x108000,0,-0x7fff8000,0x8020,-0x80000000,-0x7fefffe0,-0x7fef7fe0,0x108000];
	var spfunction3 = [0x208,0x8020200,0,0x8020008,0x8000200,0,0x20208,0x8000200,0x20008,0x8000008,0x8000008,0x20000,0x8020208,0x20008,0x8020000,0x208,0x8000000,0x8,0x8020200,0x200,0x20200,0x8020000,0x8020008,0x20208,0x8000208,0x20200,0x20000,0x8000208,0x8,0x8020208,0x200,0x8000000,0x8020200,0x8000000,0x20008,0x208,0x20000,0x8020200,0x8000200,0,0x200,0x20008,0x8020208,0x8000200,0x8000008,0x200,0,0x8020008,0x8000208,0x20000,0x8000000,0x8020208,0x8,0x20208,0x20200,0x8000008,0x8020000,0x8000208,0x208,0x8020000,0x20208,0x8,0x8020008,0x20200];
	var spfunction4 = [0x802001,0x2081,0x2081,0x80,0x802080,0x800081,0x800001,0x2001,0,0x802000,0x802000,0x802081,0x81,0,0x800080,0x800001,0x1,0x2000,0x800000,0x802001,0x80,0x800000,0x2001,0x2080,0x800081,0x1,0x2080,0x800080,0x2000,0x802080,0x802081,0x81,0x800080,0x800001,0x802000,0x802081,0x81,0,0,0x802000,0x2080,0x800080,0x800081,0x1,0x802001,0x2081,0x2081,0x80,0x802081,0x81,0x1,0x2000,0x800001,0x2001,0x802080,0x800081,0x2001,0x2080,0x800000,0x802001,0x80,0x800000,0x2000,0x802080];
	var spfunction5 = [0x100,0x2080100,0x2080000,0x42000100,0x80000,0x100,0x40000000,0x2080000,0x40080100,0x80000,0x2000100,0x40080100,0x42000100,0x42080000,0x80100,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,0x80100,0x80000,0x42000100,0x100,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,0x100,0x2000000,0x42080000,0x42080100,0x80100,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,0x80100,0x2000100,0x40000100,0x80000,0,0x40080000,0x2080100,0x40000100];
	var spfunction6 = [0x20000010,0x20400000,0x4000,0x20404010,0x20400000,0x10,0x20404010,0x400000,0x20004000,0x404010,0x400000,0x20000010,0x400010,0x20004000,0x20000000,0x4010,0,0x400010,0x20004010,0x4000,0x404000,0x20004010,0x10,0x20400010,0x20400010,0,0x404010,0x20404000,0x4010,0x404000,0x20404000,0x20000000,0x20004000,0x10,0x20400010,0x404000,0x20404010,0x400000,0x4010,0x20000010,0x400000,0x20004000,0x20000000,0x4010,0x20000010,0x20404010,0x404000,0x20400000,0x404010,0x20404000,0,0x20400010,0x10,0x4000,0x20400000,0x404010,0x4000,0x400010,0x20004010,0,0x20404000,0x20000000,0x400010,0x20004010];
	var spfunction7 = [0x200000,0x4200002,0x4000802,0,0x800,0x4000802,0x200802,0x4200800,0x4200802,0x200000,0,0x4000002,0x2,0x4000000,0x4200002,0x802,0x4000800,0x200802,0x200002,0x4000800,0x4000002,0x4200000,0x4200800,0x200002,0x4200000,0x800,0x802,0x4200802,0x200800,0x2,0x4000000,0x200800,0x4000000,0x200800,0x200000,0x4000802,0x4000802,0x4200002,0x4200002,0x2,0x200002,0x4000000,0x4000800,0x200000,0x4200800,0x802,0x200802,0x4200800,0x802,0x4000002,0x4200802,0x4200000,0x200800,0,0x2,0x4200802,0,0x200802,0x4200000,0x800,0x4000002,0x4000800,0x800,0x200002];
	var spfunction8 = [0x10001040,0x1000,0x40000,0x10041040,0x10000000,0x10001040,0x40,0x10000000,0x40040,0x10040000,0x10041040,0x41000,0x10041000,0x41040,0x1000,0x40,0x10040000,0x10000040,0x10001000,0x1040,0x41000,0x40040,0x10040040,0x10041000,0x1040,0,0,0x10040040,0x10000040,0x10001000,0x41040,0x40000,0x41040,0x40000,0x10041000,0x1000,0x40,0x10040040,0x1000,0x41040,0x10001000,0x40,0x10000040,0x10040000,0x10040040,0x10000000,0x40000,0x10001040,0,0x10041040,0x40040,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,0x41000,0x41000,0x1040,0x1040,0x40040,0x10000000,0x10041000];

	//creamos las llaves para DES
	var claves = crearLlaves(clave);

	//Inicializamos algunas variables
	var m = 0, i, j, k, temp, temp2, right1, right2, left, right, looping;
	//var cbcleft, cbcleft2, cbcright, cbcright2;
	var endloop, loopinc;
	var largoTexto = tPlano.length;	

	var vueltas = 3; 
	looping = encOrDenc ? [0, 32, 2] : [30, -2, -2];

	//Rellenamos el texto plano
	tPlano += "        ";

	//Guardaremos el resultado aqui;
	var resultado = "";
	var tempResultado = "";

	//Pasamos el vector inicial a entero
	//cbcleft = (vInicial.charCodeAt(m++) << 24) | (vInicial.charCodeAt(m++) << 16) | (vInicial.charCodeAt(m++) << 8) | vInicial.charCodeAt(m++);
    //cbcright = (vInicial.charCodeAt(m++) << 24) | (vInicial.charCodeAt(m++) << 16) | (vInicial.charCodeAt(m++) << 8) | vInicial.charCodeAt(m++);
    m = 0;


    //Ahora encriptamos por cada 64 bits del texto plano
    while (m < largoTexto) {
    	//Contamos el numero de bloque
    	k++;


    	//Pasamos el texto plano a entero
    	left = (tPlano.charCodeAt(m++) << 24) | (tPlano.charCodeAt(m++) << 16) | (tPlano.charCodeAt(m++) << 8) | tPlano.charCodeAt(m++);
    	right = (tPlano.charCodeAt(m++) << 24) | (tPlano.charCodeAt(m++) << 16) | (tPlano.charCodeAt(m++) << 8) | tPlano.charCodeAt(m++);

    	//Como haremos CBC, hacemos XOR con el resultado anterior
    	// if (encOrDenc) {
    	// 	left ^= cbcleft;
    	// 	right ^= cbcright;
    	// } else {    		
    	// 	cbcleft2 = cbcleft;
    	// 	cbcright2 = cbcright;
    	// 	cbcleft = left;
    	// 	cbcright = right;
    	// }

    	//Premutamos los primeros 64 bits del mensaje
    	temp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
    	right ^= temp; left ^= (temp << 4);

    	temp = ((left >>> 16) ^ right) & 0x0000ffff;
    	right ^= temp; left ^= (temp << 16);

    	temp = ((right >>> 2) ^ left) & 0x33333333;
    	left ^= temp; right ^= (temp << 2);

    	temp = ((right >>> 8) ^ left) & 0x00ff00ff;
    	left ^= temp;
    	right ^= (temp << 8);

    	temp = ((left >>> 1) ^ right) & 0x55555555;
    	right ^= temp;
    	left ^= (temp << 1);

    	left = ((left << 1) | (left >>> 31));
    	right = ((right << 1) | (right >>> 31)); 


    	for (j=0; j<vueltas; j+=3) {
    		endloop = looping[j+1];
    		loopinc = looping[j+2];
		    //Ahora encriptamos o desencriptamos según corresponda
		    for (i=looping[j]; i!=endloop; i+=loopinc) {


		    	//Hacemos XOR con la i clave
		    	right1 = right ^ claves[i]; 
		        right2 = ((right >>> 4) | (right << 28)) ^ claves[i+1];

		        //El resultado pasa por las cajas S y se intercambia el lado derecho con el izquierdo
		        temp = left;
		        left = right;
		        right = temp ^ (spfunction2[(right1 >>> 24) & 0x3f] | spfunction4[(right1 >>> 16) & 0x3f]
		            | spfunction6[(right1 >>>  8) & 0x3f] | spfunction8[right1 & 0x3f]
		            | spfunction1[(right2 >>> 24) & 0x3f] | spfunction3[(right2 >>> 16) & 0x3f]
		            | spfunction5[(right2 >>>  8) & 0x3f] | spfunction7[right2 & 0x3f]);
		        
		      	}
		      	
		      	//Intercambiamos el lado derecho y el izquierdo
		      	temp = left;
		      	left = right;
		      	right = temp;
		    }

	    //movemos un bit a la derecha
	    left = ((left >>> 1) | (left << 31)); 
	    right = ((right >>> 1) | (right << 31)); 

	    //Y hacemos la última permutación
	    temp = ((left >>> 1) ^ right) & 0x55555555; right ^= temp; left ^= (temp << 1);
	    temp = ((right >>> 8) ^ left) & 0x00ff00ff; left ^= temp; right ^= (temp << 8);
	    temp = ((right >>> 2) ^ left) & 0x33333333; left ^= temp; right ^= (temp << 2);
	    temp = ((left >>> 16) ^ right) & 0x0000ffff; right ^= temp; left ^= (temp << 16);
	    temp = ((left >>> 4) ^ right) & 0x0f0f0f0f; right ^= temp; left ^= (temp << 4);


	    //Como es CBC, hacemos XOR con el resultado anterior
	    // if (encOrDenc) {
	    // 	cbcleft = left;
	    // 	cbcright = right;
	    // } else {
	    // 	left ^= cbcleft2;
	    // 	right ^= cbcright2;
	    // }
	    tempResultado += String.fromCharCode ((left>>>24), ((left>>>16) & 0xff), ((left>>>8) & 0xff), (left & 0xff), (right>>>24), ((right>>>16) & 0xff), ((right>>>8) & 0xff), (right & 0xff));


	    //Debemos transmitir este resultado temporal
	    // if(!encOrDenc){//Si no tenemos de desencriptar
	    // 	//Transmitimos el bloque
	    // 	var datos = {
	    // 		modo: 'bloque',
	    // 		numero: k,
	    // 		bloque: tempResultado
	    // 	}
	    // 	socket.emit('mensaje', datos);
	    // }

	    
	    //Guardamos el resultado y limpiamos el temporal para la próxma vuelta
	    resultado += tempResultado;
	    tempResultado = "";	    
	}
	//Terminada la encriptación, avisamos que terminamos de enviar bloques
	// if(!encOrDenc){
	// 	datos = {
	// 		modo: 'finTransmision'
	// 	}
	// 	socket.emit('mensaje', datos);
	// }

	return resultado;
};

