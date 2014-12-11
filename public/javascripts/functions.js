var socket = io.connect();
var myUsername;
var myPassword;
var myReceptor;
var myNonce;
var mensaje;

var claveSesion = {};

//al actualizar la página eliminamos la sesión del usuario de sessionStorage
$(document).ready(function()
{
    manageSessions.unset("login");
    manageSessions.unset("pass");
});

//función para mantener el scroll siempre al final del div donde se muestran los mensajes
//con una pequeña animación
function animateScroll()
{
    var container = $('#containerMessages');
    container.animate({"scrollTop": $('#containerMessages')[0].scrollHeight}, "slow");
}

//función anónima donde vamos añadiendo toda la funcionalidad del chat
$(function()
{
    //llamamos a la función que mantiene el scroll al fondo
    animateScroll();
    //si el usuario no ha iniciado sesión prevenimos que pueda acceder
    showModal("NodeHam - Inicio de Sesión",renderForm());
    //al poner el foco en el campo de texto del mensaje o pulsar el botón de enviar
    $("#containerSendMessages, #containerSendMessages input").on("focus click", function(e)
    {
        e.preventDefault();
        if(!manageSessions.get("login"))
        {
            showModal("NodeHam - Inicio de Sesión",renderForm(), false);
        }
    });

    //al pulsar en el botón de Entrar 
    $("#loginBtn").on("click", function(e)
    {
        e.preventDefault();
        //si el nombre de usuario es menor de 2 carácteres
        if($(".username").val().length < 1)
        {
            //ocultamos el mensaje de error
            $(".errorMsg").hide();
            //mostramos el mensaje de nuevo y ponemos el foco en el campo de texto
            $(".username").after("<div class='col-md-12 alert alert-danger errorMsg'>Debes introducir un nombre para acceder al chat.</div>").focus(); 
            //cortamos la ejecución
            return;
        }
        if($(".username").val().indexOf(' ') != -1){
            //ocultamos el mensaje de error
            $(".errorMsg").hide();
            //mostramos el mensaje de nuevo y ponemos el foco en el campo de texto
            $(".username").after("<div class='col-md-12 alert alert-danger errorMsg'>Tu nombre de usuario no debe contener espacios.</div>").focus(); 
            //cortamos la ejecución            
            return;
        }
        //si el nombre de usuario contiene espacios

        //si la contraseña es menor de 8 carácteres
        if($(".password").val().length < 8)
        {
            //ocultamos el mensaje de error
            $(".errorMsg").hide();
            //mostramos el mensaje de nuevo y ponemos el foco en el campo de texto
            $(".password").after("<div class='col-md-12 alert alert-danger errorMsg'>La contraseña debe tener un largo de 8 caracteres.</div>").focus(); 
            //cortamos la ejecución
            return;
        }
        //en otro caso, creamos la sesión login y lanzamos el evento loginUser
        //pasando el nombre del usuario que se ha conectado
        manageSessions.set("login", $(".username").val());
        myUsername = $(".username").val();
        manageSessions.set("pass", $(".password").val());
        myPassword = $(".password").val();
        //llamamos al evento loginUser, el cuál creará un nuevo socket asociado a nuestro usuario
        socket.emit("loginUser", manageSessions.get("login"), manageSessions.get("pass"));
        //ocultamos la ventana modal
        $("#formModal").modal("hide");
        //llamamos a la función que mantiene el scroll al fondo
        animateScroll();
    });

    //si el usuario está en uso lanzamos el evento userInUse y mostramos el mensaje
    socket.on("userInUse", function()
    {
        //mostramos la ventana modal
        $("#formModal").modal("show");
        //eliminamos la sesión que se ha creado relacionada al usuario
        manageSessions.unset("login");
        manageSessions.unset("pass");
        //ocultamos los mensajes de error de la modal
        $(".errorMsg").hide();
        //añadimos un nuevo mensaje de error y ponemos el foco en el campo de texto de la modal
        $(".username").after("<div class='col-md-12 alert alert-danger errorMsg'>El nombre de usuario ya está en uso.</div>").focus();
        return; 
    });

    //cuando se emite el evento refreshChat
    socket.on("refreshChat", function(action, message)
    {

        //simplemente mostramos el nuevo mensaje a los usuarios
        //si es una nueva conexión
        if(action == "conectado")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-info'>" + message + "</p>");
        }
        //si es una desconexión
        else if(action == "desconectado")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-danger'>" + message + "</p>");
        }
        //si es un nuevo mensaje 
        else if(action == "msg")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-warning'>" + message + "</p>");
        }
        //si el que ha conectado soy yo
        else if(action == "yo")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-success'>" + message + "</p>");
        }
        else if(action == "crypt")
        {   
            console.log("recibiendo mensaje encriptado");
            console.log("Mensaje: " + message);
            var interlocutor = message.substring(0, message.indexOf("||"));
            console.log("Interlocutor: " + interlocutor);
            var payload = message.substring(message.indexOf("||")+2);  
            console.log("Payload: " + payload);
            console.log("Clave de sesión: " + claveSesion[interlocutor]);
            if(claveSesion[interlocutor]){
                //var nonce = encDes(payload, claveSesion[emisor], 1);
                var planoM = encDes(payload, claveSesion[interlocutor], 1);
                $("#chatMsgs").append("<p class='col-md-12 alert-success'>(Mensaje de " + interlocutor + ": " + planoM + ")</p>");
            }
        }
        //llamamos a la función que mantiene el scroll al fondo
        animateScroll();
    });

    socket.on("handshake", function(action, message)
    {

        //Paso 3 del handshake - EMISOR
        if(action == "2")
        {
            var planoM = encDes(message, myPassword, 1);
            var payload = planoM.substring(planoM.indexOf('@@')+2);
            var clave = planoM.substring(planoM.indexOf('!!')+2, planoM.indexOf('**'));
            claveSesion[myReceptor] = clave;
            socket.emit("handshake", "3", payload);
        }
        //Paso 4 del handshake - RECEPTOR
        else if(action == "3")
        {
            var planoM = encDes(message, myPassword, 1);
            var clave = planoM.substring(0, planoM.indexOf("||"));
            var emisor = planoM.substring(planoM.indexOf("||") + 2, planoM.indexOf(" "));
            $("#chatMsgs").append("<p class='col-md-12 alert-warning'>Recibiendo handshake de usuario "+emisor+".</p>");
            claveSesion[emisor] = clave; 
            var nonce = Math.floor(Math.random() * 100000000);
            myNonce = nonce;
            var payload = encDes(nonce.toString(), claveSesion[emisor], 0);
            var mensaje = myUsername + "||" + payload;
            socket.emit("handshake", "4", mensaje);
        }
        //Paso 5 del handshake - EMISOR
        else if(action == "4")
        {
            var receptor = message.substring(0, message.indexOf("||"));
            var payload = message.substring(message.indexOf("||")+2);
            var nonce = parseInt(encDes(payload, claveSesion[receptor], 1));
            nonce = nonce - 1;
            var payload = encDes(nonce.toString(), claveSesion[receptor], 0);
            var mensaje = myUsername + "||" + payload;
            socket.emit("handshake", "5", mensaje);
            $("#chatMsgs").append("<p class='col-md-12 alert-warning'>Handshake finalizado con éxito!!</p>");
        //Paso 6 del handshake - RECEPTOR
        }else if(action == "5"){
            var emisor = message.substring(0, message.indexOf("||"));
            var payload = message.substring(message.indexOf("||")+2);
            var nonce = encDes(payload, claveSesion[emisor], 1);
            if(nonce == myNonce - 1){
                $("#chatMsgs").append("<p class='col-md-12 alert-danger'>Handshake finalizado con éxito!!</p>");
                var mensaje = myUsername;
                socket.emit("handshake", "6", mensaje);
            }
        //Paso 7 - EMISOR, FIN DE HANDSHAKE Y MENSAJE INICIAL
        }else if(action == "6"){
            var receptor = message;
            var payload = encDes(mensaje, claveSesion[receptor], 0);
            var data = myUsername + "||" + payload;
            socket.emit("handshake", "7", data);
        //Paso 8 - Comunicación encriptada
        }else if(action = "7"){
            socket.emit("addNewMessage", "crypt", message);        
        }

        //llamamos a la función que mantiene el scroll al fondo
        animateScroll();
    });

    //actualizamos el sidebar que contiene los usuarios conectados cuando
    //alguno se conecta o desconecta, el parámetro son los usuarios online actualmente
    socket.on("updateSidebarUsers", function(usersOnline)
    {

        $("#chatUsers").html("");

        if(!isEmptyObject(usersOnline))
        {

            $.each(usersOnline, function(key, val)
            {
                $("#chatUsers").append("<p class='col-md-12 alert-info'>" + key + "</p>");
            })
        }
    });

//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################

    //al pulsar el botón de enviar mensaje
    $('.sendMsg').on("click", function() 
    {
        //capturamos el valor del campo de texto donde se escriben los mensajes
        var message = $(".message").val();
        if(message.length > 0)
        {
            //Paso 1 del handshake - EMISOR
            if(message.indexOf('@') === 0)
            {
                var rec = message.substring(1, message.indexOf(' '));
                var crypto = message.substring(message.indexOf(' ') +1);
                if(claveSesion[rec]){
                    var enc = encDes(crypto, claveSesion[rec], 1)
                    var data = myUsername + "||" + enc;
                    console.log("Payload: " + enc);
                    console.log(claveSesion[rec]);
                    socket.emit("handshake", "7", data);
                }else{
                    var nonce = Math.floor((Math.random() * 1000) + 1);
                    var datos = {
                        emisor: myUsername,
                        receptor: rec,
                        nonce: Math.floor((Math.random() * 1000) + 1)
                    };
                    myReceptor = datos.receptor;
                    $("#chatMsgs").append("<p class='col-md-12 alert-warning'>Iniciando handshake con usuario "+myReceptor+".</p>");
                    sendCrypto(datos, crypto);
                }

                $(".message").val("");
            }else{
                //emitimos el evento addNewMessage, el cual simplemente mostrará
                //el mensaje escrito en el chat con nuestro nombre, el cual 
                //permanece en la sesión del socket relacionado a mi conexión
                socket.emit("addNewMessage", message);
                //limpiamos el mensaje
            }
            $(".message").val("");
        }
        else
        {
            showModal("Error formulario","<p class='alert alert-danger'>Debes escribir un mensaje.</p>", "true");
        }
        //llamamos a la función que mantiene el scroll al fondo
        animateScroll();
    });
});

//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################
//##########################################################################################################################################

//funcion que recibe como parametros el titulo y el mensaje de la ventana modal
//reaprovechar codigo siempre que se pueda
function showModal(title,message,showClose)
{
    console.log(showClose)
    $("h2.title-modal").text(title).css({"text-align":"center"});
    $("p.formModal").html(message);
    if(showClose == "true")
    {
        $(".modal-footer").html('<a data-dismiss="modal" aria-hidden="true" class="btn btn-danger">Cerrar</a>');
        $("#formModal").modal({show:true});
    }
    else
    {
        $("#formModal").modal({show:true, backdrop: 'static', keyboard: true });
    }
}

//formulario html para mostrar en la ventana modal
function renderForm()
{
    var html = "";
    html += '<div class="form-group" id="formLogin">';
    html += '<input type="text" id="username" class="form-control username" placeholder="Nombre de usuario:">';
    html += '</div>';
    html += '<div class="form-group" id="formLogin">';
    html += '<input type="password" id="password" class="form-control password" placeholder="Contraseña (8 caracteres o más):">';
    html += '</div>';
    html += '<button type="submit" class="btn btn-primary btn-large" id="loginBtn">Entrar</button>';
    return html;
}

//objeto para el manejo de sesiones
var manageSessions = {
    //obtenemos una sesión //getter
    get: function(key) {
        return sessionStorage.getItem(key);
    },
    //creamos una sesión //setter
    set: function(key, val) {
        return sessionStorage.setItem(key, val);
    },
    //limpiamos una sesión
    unset: function(key) {
        return sessionStorage.removeItem(key);
    }
};

//función que comprueba si un objeto está vacio, devuelve un boolean
function isEmptyObject(obj) 
{
    var name;
    for (name in obj) 
    {
        return false;
    }
    return true;
}

function sendCrypto(datos, msg)
{
    mensaje = msg;
    socket.emit("handshake","1", datos);
}