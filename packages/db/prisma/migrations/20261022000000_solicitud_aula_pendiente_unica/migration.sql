-- A lo sumo una solicitud Pendiente por clase, aunque lleguen dos pedidos a la vez.
CREATE UNIQUE INDEX "solicitud_aula_clase_pendiente_key" ON "solicitud_aula"("claseId") WHERE "estado" = 'PENDIENTE';
