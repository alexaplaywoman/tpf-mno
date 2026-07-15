router.get("/fechas-ocupadas", async function(req,res){

    try{


        let sql = `
            SELECT FECHA_RESERVA
            FROM RESERVAS
        `;


        let resultado = await conexion.query(sql);



        let fechas = resultado.map(r => {

            let fecha = new Date(r.FECHA_RESERVA);


            return fecha.getFullYear()
            + "-"
            + String(fecha.getMonth()+1).padStart(2,"0")
            + "-"
            + String(fecha.getDate()).padStart(2,"0");

        });



        res.json(fechas);



    }catch(error){

        console.log(error);

        res.status(500).json({
            error:"Error obteniendo fechas"
        });

    }


});