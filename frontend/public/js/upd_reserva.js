document.addEventListener('DOMContentLoaded', async function () {


    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("update-reserva-form");

    const errorMessage = document.getElementById("error-message");

    const selectEstado = document.getElementById("estado");
    const selectLaboratorio = document.getElementById("laboratorio");

    const horaInicio = document.getElementById("horaInicio");
    const horaFin = document.getElementById("horaFin");


    const monthYearEl = document.getElementById("month-year");
    const daysEl = document.getElementById("days");

    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");

    const inputFecha = document.getElementById("fecha");



    if(btnInicio){

        btnInicio.addEventListener("click", function(e){

            e.preventDefault();

            window.location.href = "/list_reservas.html";

        });

    }



    const id =
        new URLSearchParams(window.location.search).get("id");



    if(!id){

        errorMessage.textContent =
            "Falta el ID de la reserva.";

        return;

    }



    const usuario =
        sessionStorage.getItem("usuario");


    const clave =
        sessionStorage.getItem("clave");



    if(!usuario || !clave){

        errorMessage.textContent =
            "Faltan credenciales.";

        return;

    }



    let fechaSeleccionada = "";

    let selectedDate = null;

    let reservasOcupadas = [];

    let estadoReservaActual = null;

    let currentDate = new Date();



    async function cargarEstados(){

    try{

        const respuesta = await fetch(
            `/api/reservas/estados/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        );


        if(!respuesta.ok){

            throw new Error(
                "No se pudieron cargar los estados."
            );

        }


        const estados = await respuesta.json();


        console.log("Estados:", estados);


        selectEstado.innerHTML = "";


        estados.forEach(estado=>{


            const option =
                document.createElement("option");


            option.value =
                estado.id_estado_reserva;


            option.textContent =
                estado.nombre;


            selectEstado.appendChild(option);


        });


    }catch(error){


        console.error(
            "Error estados:",
            error
        );


        errorMessage.textContent =
            error.message;


    }

}






    async function cargarLaboratorios(){


        try{


            const respuesta =
                await fetch(
                    `/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
                );



            if(!respuesta.ok){

                throw new Error(
                    "No se pudieron cargar los laboratorios."
                );

            }



            const laboratorios =
                await respuesta.json();



            selectLaboratorio.innerHTML = `

                <option value="">
                    Seleccione un laboratorio
                </option>

            `;



            laboratorios.forEach(lab=>{


                const option =
                    document.createElement("option");



                option.value =
                    lab.NUMERO_LABORATORIO;



                option.textContent =
                    `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;



                selectLaboratorio.appendChild(option);


            });



        }catch(error){


            console.error(error);


            errorMessage.textContent =
                error.message;


        }


    }






    async function cargarReserva(){


        try{


            const respuesta =
                await fetch(
                    `/api/reservas/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
                );



            const data =
                await respuesta.json();



            if(!respuesta.ok){

                throw new Error(
                    data.error ||
                    "No se pudo cargar la reserva."
                );

            }



            const reserva =
                data.reserva || data;



            console.log(
                "Reserva cargada:",
                reserva
            );



            selectLaboratorio.value =
                reserva.NUMERO_LABORATORIO ?? "";



            // guardamos para seleccionar cuando cargue el combo

            estadoReservaActual =
                reserva.ID_ESTADO_RESERVA;



            fechaSeleccionada =
                String(reserva.FECHA_A_RESERVAR)
                .split("T")[0];



            horaInicio.value =
                String(reserva.HORA_INICIO)
                .substring(0,5);



            horaFin.value =
                String(reserva.HORA_FIN)
                .substring(0,5);



        }catch(error){


            console.error(error);


            errorMessage.textContent =
                error.message;


        }


    }






    async function cargarFechasOcupadas(){


        try{


            const respuesta =
                await fetch(
                    `/api/reservas/fechas-ocupadas?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
                );



            if(respuesta.ok){


                reservasOcupadas =
                    await respuesta.json();



                console.log(
                    "Fechas ocupadas:",
                    reservasOcupadas
                );


            }else{


                reservasOcupadas = [];


            }



        }catch(error){


            console.error(
                error
            );


            reservasOcupadas = [];


        }


    }

    function renderCalendar(){


    daysEl.innerHTML = "";


    const year =
        currentDate.getFullYear();


    const month =
        currentDate.getMonth();



    const meses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];



    monthYearEl.textContent =
        `${meses[month]} ${year}`;



    const primerDia =
        new Date(year, month, 1).getDay();


    const ultimoDia =
        new Date(year, month + 1, 0).getDate();



    for(let i = 0; i < primerDia; i++){

        daysEl.appendChild(
            document.createElement("div")
        );

    }




    const hoy = new Date();

    hoy.setHours(0,0,0,0);




    for(let i = 1; i <= ultimoDia; i++){


        const day =
            document.createElement("div");



        day.classList.add("day");


        day.textContent =
            i;



        const fecha =
            new Date(year, month, i);



        const fechaString =
            `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;



        const esFinSemana =
            fecha.getDay() === 0 ||
            fecha.getDay() === 6;



        const esPasado =
            fecha < hoy;



        const reservaEseDia =
            reservasOcupadas.find(r=>{


                const fechaReserva =
                    r.FECHA_A_RESERVAR ||
                    r.fecha ||
                    r.fecha_a_reservar;



                return String(fechaReserva)
                    .split("T")[0] === fechaString;


            });




        // SOLO BLOQUEA PASADOS Y FINES DE SEMANA

        if(esPasado || esFinSemana){


            day.classList.add(
                "deshabilitado"
            );



            if(esPasado){

                day.title =
                    "Fecha pasada";


            }else{


                day.title =
                    "No se permiten reservas los fines de semana";


            }



        }else{


            // SI TIENE RESERVA SOLO PONE EL PUNTO

            if(reservaEseDia){


                day.classList.add(
                    "has-events"
                );


                day.title =
                    "Hay una reserva ese día";


            }




            day.addEventListener(
                "click",
                function(){


                    selectedDate =
                        new Date(
                            year,
                            month,
                            i
                        );



                    fechaSeleccionada =
                        fechaString;



                    if(inputFecha){

                        inputFecha.value =
                            fechaString;

                    }



                    renderCalendar();


                }
            );


        }




        // HOY

        if(
            hoy.getDate() === i &&
            hoy.getMonth() === month &&
            hoy.getFullYear() === year
        ){


            day.classList.add(
                "today"
            );


        }




        // SELECCIONADO

        if(
            selectedDate &&
            selectedDate.getDate() === i &&
            selectedDate.getMonth() === month &&
            selectedDate.getFullYear() === year
        ){


            day.classList.add(
                "selected"
            );


        }



        daysEl.appendChild(day);


    }


}







if(prevMonthBtn){

    prevMonthBtn.onclick = ()=>{


        currentDate.setMonth(
            currentDate.getMonth()-1
        );


        renderCalendar();


    };


}




if(nextMonthBtn){

    nextMonthBtn.onclick = ()=>{


        currentDate.setMonth(
            currentDate.getMonth()+1
        );


        renderCalendar();


    };


}




if(todayBtn){

    todayBtn.onclick = ()=>{


        currentDate =
            new Date();


        renderCalendar();


    };


}







await cargarEstados();

await cargarLaboratorios();

await cargarReserva();

await cargarFechasOcupadas();


renderCalendar();







form.addEventListener(
"submit",
async function(e){


    e.preventDefault();



    const datos = {


        usuario,

        clave,


        numero_laboratorio:
            selectLaboratorio.value,


        fecha_a_reservar:
            fechaSeleccionada,


        hora_inicio:
            horaInicio.value,


        hora_fin:
            horaFin.value,


        id_estado_reserva: Number(selectEstado.value)


    };

    console.log("ENVIANDO:", datos);

    console.log(
        "Datos enviados:",
        datos
    );



    try{


        const respuesta =
            await fetch(
                `/api/reservas/reprogramar/${id}`,
                {


                    method:"POST",


                    headers:{


                        "Content-Type":
                            "application/json"


                    },


                    body:
                        JSON.stringify(datos)


                }
            );



        const resultado =
            await respuesta.json();



        console.log(
            "Respuesta backend:",
            resultado
        );



        if(
            !respuesta.ok ||
            resultado.success === false
        ){


            throw new Error(
                resultado.error ||
                "Error al actualizar la reserva."
            );


        }



        window.location.href =
            "/list_reservas.html";



    }catch(error){


        console.error(error);


        errorMessage.textContent =
            error.message;


    }


});



});