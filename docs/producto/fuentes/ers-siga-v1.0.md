<!-- Texto extraído del documento "5K2_GRUPO1_Requerimientos y analisis_SiGA_V1_0.docx" (Drive, ENTREGABLE 5) el 14/10/2026. Copia de referencia; el original es la fuente de verdad. -->

ERS SiGA - IEEE 830

|              |      |
| :----------: | :--: |
| Versión: 1.0 | Pág. |

|     |                                          |           |
| :-: | :--------------------------------------: | :-------: |
|     | Especificación de requisitos de software | Rev. Pág. |

Especificación de Requisitos de Software

Proyecto: SiGA

Versión del documento: 1.0

Sistema web de gestión operativa académica – UTN FRT

Grupo 1 – 5K2 · Proyecto Final · Ingeniería en Sistemas de Información

|     |                    |
| :-: | :----------------: |
|     | Septiembre de 2026 |

Ficha del documento

|            |          |                                                  |                 |
| :--------: | :------: | :----------------------------------------------: | :-------------: |
|   Fecha    | Revisión |                      Autor                       | Verificado por: |
| 28/09/2026 |   1.0    | Rocha F. / Rodríguez N. / Romano L. / Sánchez E. |                 |

Documento validado por las partes en fecha: \_\_\_\_ / \_\_\_\_ / 2026

|                                                                                      |                                   |
| :----------------------------------------------------------------------------------: | :-------------------------------: |
|                                    Por el cliente                                    |   Por la empresa suministradora   |
| Departamento de Sistemas – UTN FRTFdo.: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | Equipo de proyecto SiGA – Grupo 1 |

Contenido

1 Introducción

1.1 Propósito

1.2 Alcance

1.3 Definiciones, acrónimos y abreviaturas

1.4 Referencias

1.5 Visión general de la ERS

2 Descripción general

2.1 Perspectiva del Sistema

2.2 Funciones del Sistema

2.3 Características de los usuarios

2.4 Restricciones

2.5 Suposiciones y dependencias

2.6 Requisitos Futuros

3 Requisitos específicos

3.1 Requisitos de interfaces externas

3.1.1 Interfaces de usuario

3.1.2 Interfaces de hardware

3.1.3 Interfaces de software

3.1.4 Interfaces de comunicación

3.2 Requisitos funcionales

3.2.1 RF-01 – Registro de apertura y cierre de la institución

3.2.2 RF-02 – Gestión de aulas y espacios

3.2.3 RF-03 – Generación del código QR de asistencia docente

3.2.4 RF-04 – Registro de asistencia docente mediante QR

3.2.5 RF-05 – Publicación de novedades de clase

3.2.6 RF-06 – Solicitud y selección de aula por el docente

3.2.7 RF-07 – Consulta del estado de clases por el estudiante

3.2.8 RF-08 – Visualización del estado institucional

3.2.9 RF-09 – Consultas históricas para autoridades

3.2.10 RF-10 – Gestión de usuarios y perfiles

3.2.11 RF-11 – Autenticación de usuarios

3.2.12 RF-12 – Recuperación de contraseña

3.2.13 RF-13 – Gestión de datos académicos base

3.2.14 RF-14 – Publicación de avisos institucionales y notificación

3.2.15 RF-15 – Registro y seguimiento de incidencias de infraestructura

3.2.16 RF-16 – Asignación de aulas y aprobación de solicitudes

3.2.17 RF-17 – Preferencias de seguimiento y notificaciones del estudiante

3.2.18 RF-18 – Registro manual de asistencia docente (contingencia)

3.3 Requisitos de datos

3.4 Atributos del Sistema - Requisitos no funcionales

3.4.1 Requisitos de eficiencia

3.4.2 Requisitos de usabilidad

3.4.3 Requisitos de fiabilidad

3.4.4 Requisitos de portabilidad

3.4.5 Requisitos de entrega

3.4.6 Requisitos de implementación

3.4.7 Requisitos de estándares

3.4.8 Requisitos de interoperabilidad

3.4.9 Requisitos éticos

3.4.10 Requisitos de privacidad

3.4.11 Requisitos de seguridad y protección

4 Apéndices

# Introducción

Este documento es la Especificación de Requisitos de Software (ERS) del sistema SiGA, plataforma web de gestión operativa académica para la Universidad Tecnológica Nacional – Facultad Regional Tucumán (UTN FRT). Sigue la práctica recomendada IEEE 830-1998, adaptada según la plantilla de la cátedra, y la guía ISO/IEC/IEEE 29148. Corresponde a la versión 1.0 del documento.

La especificación consolida la información relevada en los entregables anteriores del proyecto: Solicitud de Aprobación de Tema, Acta de Constitución, Registro de Interesados, Matriz de Trazabilidad de Requisitos, Declaración del Alcance, Estructura de Desglose del Trabajo (EDT v3.0), Registro de Riesgos y Plan de Gestión del Proyecto. Se realizó a partir de las reuniones con interesados, la observación directa de los procesos de bedelía y la experiencia del equipo como estudiantes de la institución. Constituye la salida del paquete de trabajo 2.1.5 – Realización del Documento de Requerimientos de la EDT.

## Propósito

El propósito de esta ERS es definir de manera clara, precisa y verificable las funcionalidades, restricciones y atributos de calidad que debe cumplir SiGA. El documento funciona como acuerdo entre el equipo de proyecto y los interesados sobre qué se construirá, y sirve como base para las actividades de diseño (modelo de datos, arquitectura, seguridad e interfaces), desarrollo, pruebas y aceptación del producto mínimo viable (MVP).

Está dirigido a las siguientes audiencias:

Equipo de desarrollo del proyecto (analista, diseñador y programadores): lo usa como referencia principal para diseñar, implementar y probar el sistema.

Director de proyecto, Tutor y Cátedra de Proyecto Final: lo revisan, validan y usan para evaluar el avance y la aceptación de los entregables.

Directora de Carrera de Ingeniería en Sistemas de Información y Departamento de Sistemas – UTN FRT (cliente): validan que los requisitos respondan a la necesidad de la institución.

Bedelía, docentes y representantes estudiantiles: validan que los requisitos que los afectan describan correctamente su operatoria diaria.

Departamento de Sistemas / TIC: evalúa los requisitos de seguridad, infraestructura, despliegue y mantenimiento.

## Alcance

Nombre del sistema: SiGA – sistema web de gestión operativa académica.

SiGA centralizará y comunicará en tiempo real la información operativa del cursado presencial: el estado de apertura de la institución, la disponibilidad y el estado de las aulas, la asistencia y presencia docente, las novedades de cada clase y los avisos institucionales. Complementa a los sistemas académicos existentes (SIU-Guaraní, SYSACAD) cubriendo la coordinación del día a día, que hoy depende de canales informales como grupos de WhatsApp, redes sociales, carteles y consultas presenciales a bedelía.

El sistema hará:

Registrar y publicar el estado de la institución (abierta, cerrada, con novedades institucionales).

Gestionar aulas y espacios: capacidad, equipamiento, climatización, ventilación, estado, disponibilidad, ocupación e incidencias de infraestructura.

Generar códigos QR de asistencia docente vinculados a fecha, aula y turno, y registrar la asistencia solo cuando el docente está dentro de la institución.

Permitir que los docentes publiquen novedades de sus clases (ausencia, demora, cambio de modalidad, suspensión o cambio de aula) y soliciten aulas según cantidad de alumnos y recursos.

Permitir que los estudiantes consulten en tiempo real el estado de sus clases, filtrando por carrera, año, comisión y materia.

Publicar avisos institucionales segmentados y notificarlos por correo electrónico.

Registrar un historial trazable de eventos y ofrecer consultas históricas consolidadas a las autoridades académicas.

Administrar usuarios con cuatro perfiles y permisos diferenciados: estudiante, docente, bedel y autoridad académica.

El sistema no hará (fuera del alcance del MVP):

Inscripción a materias o exámenes, carga de notas, historial académico ni trámites administrativos, que ya resuelven SIU-Guaraní y SYSACAD.

Integración automática con SIU-Guaraní, SYSACAD u otros sistemas institucionales: los datos académicos base se cargan en SiGA (ver Requisitos Futuros).

Liquidación de haberes, control horario laboral o sanciones al personal a partir de los registros de asistencia.

Aplicaciones móviles nativas: el acceso es exclusivamente web y responsivo.

Gestión de mantenimiento edilicio más allá del registro y seguimiento de incidencias de aulas.

Beneficios, objetivos y metas. El objetivo general, según el Acta de Constitución, es desarrollar e implementar un sistema web para la gestión operativa académica diaria que centralice y comunique información sobre clases, aulas, novedades y actividad docente, y mejore la coordinación entre estudiantes, docentes, bedeles y autoridades. Los beneficios cuantitativos esperados son:

|               Área de mejora                |                         Beneficio estimado                         |
| :-----------------------------------------: | :----------------------------------------------------------------: |
| Tiempo de consulta de información académica |                      Reducción del 40% al 60%                      |
|      Consultas presenciales a bedelía       |                      Reducción del 30% al 50%                      |
|   Uso de formularios y registros físicos    |                      Reducción del 50% al 70%                      |
|    Traslados innecesarios de estudiantes    | Reducción del 90% al 100% ante novedades comunicadas oportunamente |
|       Tiempo de difusión de novedades       |           De horas o días a minutos (máximo 60 segundos)           |
|     Trazabilidad de eventos registrados     |                   100% de las novedades cargadas                   |

Las descripciones completas de necesidad de negocio, beneficios y objetivos específicos se encuentran en el Acta de Constitución del Proyecto y en la Declaración del Alcance, referenciadas en la sección 1.4.

## Definiciones, acrónimos y abreviaturas

|         Término         |                                                                 Definición                                                                 |
| :---------------------: | :----------------------------------------------------------------------------------------------------------------------------------------: |
|           ERS           |                                                 Especificación de Requisitos de Software.                                                  |
|        RF / RNF         |                                               Requisito Funcional / Requisito No Funcional.                                                |
|           RES           |                                    Restricción: condición que limita la forma de resolver el problema.                                     |
|           CA            |                        Criterio de Aceptación definido en la Matriz de Trazabilidad de Requisitos (CA-01 a CA-09).                         |
|           MVP           |                         Producto Mínimo Viable: primera versión funcional e integrada de los módulos del sistema.                          |
|          SiGA           |                                             Nombre del sistema especificado en este documento.                                             |
|         UTN FRT         |                                       Universidad Tecnológica Nacional – Facultad Regional Tucumán.                                        |
|           ISI           |                                             Carrera de Ingeniería en Sistemas de Información.                                              |
|     Bedel / Bedelía     | Personal administrativo responsable de la gestión operativa diaria de aulas, apertura de la institución y control de la actividad docente. |
|   Autoridad académica   |            Directora de carrera, Secretaría Académica, Decanato u otro perfil jerárquico que consulta información consolidada.             |
|        Comisión         |                 Grupo de estudiantes que cursa una materia en un horario y con un docente determinado (por ejemplo, 5K2).                  |
|          Turno          |                                             Franja horaria de cursado (mañana, tarde o noche).                                             |
|    Clase programada     |                              Instancia de dictado de una comisión en una fecha, horario y aula determinados.                               |
|  Estado institucional   |     Situación general de la institución: abierta, cerrada o abierta con novedades (paro, corte de servicio, actividad parcial, etc.).      |
|         Novedad         |      Información publicada sobre una clase: ausencia, demora, cambio de modalidad (presencial/virtual), suspensión o cambio de aula.       |
|   Aviso institucional   |                     Comunicado oficial dirigido a toda la comunidad o a un segmento (carrera, año, comisión o perfil).                     |
|       Incidencia        |         Problema de infraestructura o equipamiento de un aula (proyector roto, falta de climatización, problema eléctrico, etc.).          |
| Código QR de asistencia |      Código bidimensional generado por bedelía, vinculado a fecha, aula y turno, que el docente escanea para registrar su presencia.       |
|       Tiempo real       |               En este documento: que un cambio registrado sea visible para los usuarios en 60 segundos como máximo (RNF-02).               |
|         Sesión          |                           Período de uso autenticado del sistema, representado por un token JWT con vencimiento.                           |
|           JWT           |                               JSON Web Token: token firmado que identifica al usuario autenticado y su rol.                                |
|          RBAC           |                                                     Control de acceso basado en roles.                                                     |
|           RLS           |                         Row Level Security: políticas de seguridad a nivel de fila de la base de datos PostgreSQL.                         |
|       HTTPS / TLS       |                                         Protocolo HTTP cifrado mediante Transport Layer Security.                                          |
|  SIU-Guaraní / SYSACAD  |                            Sistemas de gestión académica existentes con los que SiGA convive sin reemplazarlos.                            |
|           EDT           |                                   Estructura de Desglose del Trabajo del proyecto (SiGA-EDT-2026, v3.0).                                   |
|    Fallo del sistema    |                                     Evento en el que el sistema no funciona como esperan los usuarios.                                     |

## Referencias

|                                 Título del documento                                 |                    Referencia / Fecha / Origen                    |
| :----------------------------------------------------------------------------------: | :---------------------------------------------------------------: |
| IEEE Recommended Practice for Software Requirements Specification ANSI/IEEE 830-1998 |                            IEEE, 1998                             |
|                  Std ISO/IEC/IEEE 29148 – Requirements engineering                   |                           ISO/IEC/IEEE                            |
|                  Sommerville, I., Ingeniería del Software, 7ma Ed.                   | Cap. 6 “Requerimientos del Software” / Cap. 3 “Sistemas Críticos” |
|                   Solicitud de Aprobación de Tema – Proyecto Final                   |          Entregable 0 – 17/04/2026 – Equipo de proyecto           |
|                     Acta de Constitución del Proyecto SiGA (V2)                      |         Entregable 1 – 05/05/2026 – Director de proyecto          |
|                               Registro de Interesados                                |                Entregable 1 – 05/05/2026 – Grupo 1                |
|                    Matriz de Trazabilidad de Requisitos SiGA V1.1                    |               Entregable 2 – Cód. T045 – 01/06/2026               |
|                     Declaración del Alcance del Proyecto SiGA V2                     |               Entregable 2 – Cód. T045 – 01/06/2026               |
|               Estructura de Desglose del Trabajo (SiGA-EDT-2026) v3.0                |                     Entregable 2 – 24/08/2026                     |
|                     Cronograma del proyecto y Diagrama de Gantt                      |                    Cronograma\_Final-SIGA.mpp                     |
|                           Planificación Financiera – SiGA                            |               Planificación Financiera - Siga.xlsx                |
|                               Registro de Riesgos SiGA                               |               Entregable 3 – Cód. RR02 – 01/09/2026               |
|                        Plan de Gestión del Proyecto SiGA V1.0                        |                  Entregable 4 – Septiembre 2026                   |
|             Ley 25.326 de Protección de los Datos Personales (Argentina)             |          Boletín Oficial de la República Argentina, 2000          |
|                   Web Content Accessibility Guidelines (WCAG) 2.1                    |                             W3C, 2018                             |
|                                     OWASP Top 10                                     |            Open Worldwide Application Security Project            |

## Visión general de la ERS

El documento sigue la estructura recomendada por IEEE 830-1998. Las secciones que no aplican se indican como tales con su justificación. Se organiza así:

Introducción: propósito, alcance, definiciones, referencias y organización del documento.

Descripción general: perspectiva del sistema y su relación con el entorno, resumen de funciones, características de los usuarios, restricciones, suposiciones y dependencias, y requisitos futuros.

Requisitos específicos: requisitos de interfaces externas, requisitos funcionales (formulario de lenguaje natural estructurado), requisitos de datos y requisitos no funcionales, clasificados según Sommerville, Cap. 6.

Apéndices: matriz de trazabilidad, criterios de aceptación, matriz de permisos por perfil y modelo de estados de una clase.

Los identificadores RF-01 a RF-11 y RNF-01 a RNF-04 son los mismos de la Matriz de Trazabilidad de Requisitos, para mantener la trazabilidad con los entregables anteriores. Los requisitos RF-12 a RF-18 se incorporan en esta ERS como resultado del refinamiento del análisis (paquetes 2.1.3 Prototipos y 2.1.4 Historias de Usuario) y se derivan de funcionalidades ya comprometidas en el Acta de Constitución y en la EDT.

# Descripción general

## Perspectiva del Sistema

SiGA es un producto nuevo e independiente, que no reemplaza ni modifica sistemas existentes. Convive con SIU-Guaraní y SYSACAD, que gestionan la vida académica formal (inscripciones, notas, historial), y cubre la coordinación operativa diaria del cursado presencial. En esta versión no intercambia datos automáticamente con esos sistemas.

Es una aplicación web responsiva accesible desde cualquier navegador. El frontend y el backend se desarrollan con Next.js, React y TypeScript y se alojan en Vercel. La persistencia se realiza en PostgreSQL provisto por Supabase, que también ofrece autenticación, notificación de cambios en tiempo real y copias de seguridad. El envío de correos se resuelve con el servicio Resend. Para el registro de asistencia docente, la aplicación utiliza la cámara y la geolocalización del dispositivo mediante las APIs estándar del navegador.

Figura 1 – Diagrama de bloques de la perspectiva del sistema SiGA y su entorno

El diagrama muestra los cuatro perfiles de usuario, que acceden por HTTPS desde el navegador; los cuatro módulos funcionales definidos en la EDT (Novedades, Aulas y Espacios, Actividad Docente, Avisos y Notificaciones); el módulo transversal de usuarios y roles; el registro histórico; y los servicios externos de los que depende el sistema. SIU-Guaraní y SYSACAD aparecen como sistemas del entorno que SiGA complementa, fuera del alcance de integración de esta versión.

## Funciones del Sistema

Las funciones del sistema se organizan por módulo, siguiendo los paquetes de trabajo de desarrollo de la EDT (3.1 a 3.4):

|                  Módulo                   |                                                                                        Funciones principales                                                                                         |         Requisitos         |
| :---------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------: |
| Gestión de Usuarios y Roles (transversal) | Inicio y cierre de sesión; recuperación de contraseña; alta, edición y baja de usuarios; asignación de perfil y permisos; carga de datos académicos base (carreras, materias, comisiones, horarios). | RF-10, RF-11, RF-12, RF-13 |
|                 Novedades                 |                    Publicación, edición y cierre de novedades de clase por el docente; consulta en tiempo real del estado de las clases por el estudiante con filtros combinados.                    |        RF-05, RF-07        |
|             Aulas y Espacios              |        ABM de aulas y atributos; control de disponibilidad y ocupación; solicitud de aula por el docente; asignación por bedelía sin superposiciones; registro y seguimiento de incidencias.         | RF-02, RF-06, RF-15, RF-16 |
|             Actividad Docente             |                       Generación de QR de asistencia por fecha, aula y turno; registro de asistencia por escaneo con validación de ubicación; registro manual de contingencia.                       |    RF-03, RF-04, RF-18     |
|  Avisos Institucionales y Notificaciones  |   Registro del estado de apertura de la institución; visualización del estado institucional; publicación de avisos segmentados con envío por correo; preferencias de notificación del estudiante.    | RF-01, RF-08, RF-14, RF-17 |
|      Registro histórico y consultas       |                                             Registro de todos los eventos con fecha, hora y usuario; consultas históricas consolidadas para autoridades.                                             |       RF-09, RNF-03        |

## Características de los usuarios

SiGA contempla cuatro perfiles de usuario (RF-10). Todos usan navegadores web y teléfonos inteligentes en su vida cotidiana, por lo que no se requiere formación técnica específica.

|       Perfil        |                                                                  Descripción y nivel técnico                                                                  |                             Frecuencia y contexto de uso                              |                                                           Funciones principales                                                            |
| :-----------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------: |
|     Estudiante      |   Alumno de la UTN FRT (inicialmente de ISI). Manejo habitual de smartphone y aplicaciones web. Muchos trabajan o viajan desde el interior de la provincia.   |    Diaria, antes de trasladarse y durante la jornada; mayormente desde el celular.    |     Consultar estado institucional, estado de sus clases, aulas, novedades y avisos; configurar comisiones seguidas y notificaciones.      |
|       Docente       |                     Profesor o auxiliar de la carrera. Nivel técnico variable, de básico a avanzado. Usa el celular para escanear el QR.                      | En cada clase (registro de asistencia) y ante imprevistos (publicación de novedades). |                          Registrar asistencia por QR, publicar novedades, solicitar aulas, reportar incidencias.                           |
|        Bedel        | Personal de bedelía con experiencia en la operatoria diaria de aulas. Nivel técnico básico a intermedio. Usa PC en bedelía y ocasionalmente tablet o celular. |                  Continua durante todo el horario de funcionamiento.                  | Registrar apertura y cierre, gestionar aulas e incidencias, generar QR, asignar aulas, publicar avisos, administrar usuarios y datos base. |
| Autoridad académica |                                   Directora de carrera, Secretaría Académica o Decanato. Nivel técnico básico a intermedio.                                   |               Semanal o mensual, para seguimiento y toma de decisiones.               |                Consultar históricos de asistencia, novedades, uso de aulas e incidencias; publicar avisos institucionales.                 |

Nota: la EDT (paquete 2.2.4) menciona los roles “personal administrativo” y “administrador”. En esta ERS, el personal administrativo se modela con el perfil Bedel, y la administración de usuarios es un permiso de ese perfil y del perfil Autoridad académica (ver Apéndice C).

## Restricciones

RES 1 El proyecto debe entregarse en su versión final antes del 18 de noviembre de 2026, según el calendario académico de la cátedra Proyecto Final.

RES 2 El sistema debe desarrollarse con tecnologías de código abierto y servicios con planes gratuitos o de bajo costo: Next.js, React y TypeScript para la aplicación, PostgreSQL sobre Supabase para la base de datos, Vercel para el alojamiento y Resend para el envío de correos.

RES 3 El equipo de desarrollo está conformado por cuatro estudiantes que trabajan a tiempo parcial. El alcance del MVP se limita a los módulos definidos en la EDT.

RES 4 El tratamiento de datos personales debe cumplir la Ley 25.326 de Protección de los Datos Personales y las políticas institucionales de la UTN FRT.

RES 5 El sistema es una aplicación web: no se desarrollarán aplicaciones nativas para Android ni iOS.

RES 6 Toda la interfaz, los mensajes y el material de ayuda deben estar en idioma español.

RES 7 La comunicación de avisos y la recuperación de contraseña se realizarán por correo electrónico. No se usarán SMS ni servicios de mensajería con costo por mensaje.

RES 8 El acceso al entorno productivo de la institución para pruebas piloto depende de la aprobación de las autoridades de la UTN FRT y de la coordinación con el Departamento de Sistemas / TIC.

RES 9 Todo cambio sobre los requisitos aprobados en esta ERS debe tramitarse mediante el procedimiento de control de cambios del Plan de Gestión del Proyecto.

## Suposiciones y dependencias

Los requisitos de este documento dependen de los siguientes factores. Si alguno cambia, los requisitos afectados deberán revisarse:

SUP 1 La UTN FRT dispone de conexión a internet y de red Wi-Fi institucional en las áreas donde se usará el sistema.

SUP 2 Los usuarios disponen de dispositivos con navegador web actualizado. Los docentes cuentan con un smartphone con cámara y aceptan otorgar permisos de cámara y de ubicación al momento de registrar su asistencia.

SUP 3 La validación de que el escaneo del QR ocurre dentro de la institución se basa en la geolocalización del dispositivo o en la conexión a la red Wi-Fi institucional (dirección IP pública de la institución).

SUP 4 Secretaría Académica o bedelía proveerán los datos académicos base (carreras, materias, comisiones, horarios, docentes asignados) al inicio del ciclo lectivo, para su carga en el sistema.

SUP 5 Los servicios de terceros (Vercel, Supabase, Resend) mantienen su disponibilidad y sus planes gratuitos o de bajo costo durante el proyecto (Riesgo 6 del Registro de Riesgos).

SUP 6 Bedeles, docentes, estudiantes y autoridades participarán en las instancias de validación y en las pruebas de aceptación del MVP.

SUP 7 La institución autoriza la realización de pruebas piloto durante el ciclo lectivo 2026, inicialmente en la carrera de ISI.

SUP 8 La organización de la institución se basa en carreras, años, materias, comisiones y turnos. Si otra institución adopta el sistema con una estructura distinta, los requisitos de datos deberán adaptarse.

## Requisitos Futuros

Las siguientes mejoras quedan fuera del MVP y podrán analizarse en versiones posteriores:

Integración con SIU-Guaraní y SYSACAD para importar automáticamente carreras, materias, comisiones, horarios, docentes y estudiantes.

Importación masiva de datos académicos base desde planillas (CSV o Excel).

Soporte multi-institución: configuración de varias facultades o instituciones sobre una misma instalación.

Extensión a todas las carreras de la UTN FRT.

Notificaciones push mediante aplicación web progresiva (PWA) y canales adicionales como Telegram o WhatsApp.

Exportación de reportes históricos a PDF y Excel, y un tablero de indicadores para autoridades.

Reserva anticipada de aulas para eventos, clases de consulta, recuperatorios y actividades especiales.

Integración con el área de mantenimiento para derivar incidencias como órdenes de trabajo.

Registro de temas dictados por clase, solicitado por los docentes en el Registro de Interesados.

# Requisitos específicos

Esta sección detalla los requisitos que debe cumplir SiGA, con el nivel de detalle necesario para diseñar el sistema y planificar las pruebas que verifiquen su cumplimiento. Cada requisito tiene un identificador único que permite su seguimiento y trazabilidad con la Matriz de Trazabilidad de Requisitos, los paquetes de trabajo de la EDT y los criterios de aceptación.

Prioridad: Alta = imprescindible para el MVP; Media = necesaria para el MVP, pero puede entregarse simplificada sin comprometer la aceptación; Baja = deseable, se implementa si el cronograma lo permite.

## Requisitos de interfaces externas

### Interfaces de usuario

R-IU 1 La interfaz será web y responsiva, y se adaptará a pantallas desde 360 px de ancho (smartphone) hasta monitores de escritorio, sin desplazamiento horizontal.

R-IU 2 Tras iniciar sesión, cada usuario accederá a un panel principal propio de su perfil: Estudiante (Mis clases de hoy, estado institucional, avisos), Docente (Mis clases, Registrar asistencia, Publicar novedad, Solicitar aula), Bedel (Estado institucional, Aulas, QR de asistencia, Solicitudes, Incidencias, Avisos, Usuarios) y Autoridad académica (Consultas históricas, Avisos).

R-IU 3 El estado institucional se mostrará en un indicador destacado, visible en la parte superior de todas las pantallas.

R-IU 4 Los estados de clase y de aula se representarán con color, icono y texto a la vez (por ejemplo, verde “Docente presente”, amarillo “Demorada”, rojo “Suspendida”), para no depender solo del color.

R-IU 5 La pantalla de registro de asistencia del docente abrirá directamente la cámara del dispositivo para leer el código QR, sin pasos intermedios.

R-IU 6 La pantalla de generación de QR del bedel mostrará el código en tamaño grande, junto con el aula, el turno y el tiempo restante de validez.

R-IU 7 Los formularios validarán los datos al ingresarlos y mostrarán los mensajes de error junto al campo afectado, en español y en lenguaje claro.

R-IU 8 La interfaz respetará una identidad visual única (paleta, tipografía y componentes reutilizables) definida en la guía de estilos del paquete 2.2.5 Diseño de Interfaces de Usuario.

### Interfaces de hardware

R-IH 1 El sistema no requiere hardware específico. Funciona sobre computadoras, tablets y smartphones con navegador web y conexión a internet.

R-IH 2 Para registrar la asistencia, el dispositivo del docente debe tener cámara (lectura del QR) y, preferentemente, receptor GPS o servicios de ubicación (validación de presencia en la institución).

R-IH 3 El dispositivo de bedelía que muestre el QR debe tener una pantalla que permita escanearlo a una distancia de al menos 50 cm (monitor de PC, tablet o televisor conectado).

### Interfaces de software

R-INTERF SW 1 Supabase (PostgreSQL, Auth, Realtime y Storage). Propósito: persistir los datos del sistema, autenticar usuarios y notificar cambios en tiempo real. Interfaz: conexión cifrada a la base de datos PostgreSQL y SDK/API REST de Supabase con claves almacenadas en variables de entorno del servidor.

R-INTERF SW 2 Resend. Propósito: enviar correos transaccionales (avisos institucionales, novedades a estudiantes suscriptos y recuperación de contraseña). Interfaz: API REST HTTPS con clave de API; el contenido se envía en formato HTML con alternativa de texto plano.

R-INTERF SW 3 Vercel. Propósito: alojar y ejecutar la aplicación Next.js (frontend y funciones de servidor) y desplegar automáticamente desde el repositorio mediante el pipeline de CI/CD.

R-INTERF SW 4 APIs del navegador. Propósito: acceder a la cámara (MediaDevices/getUserMedia) para leer el QR y a la Geolocation API para validar la ubicación del docente. Solo se solicitan al momento de registrar la asistencia y requieren el consentimiento del usuario.

R-INTERF SW 5 Navegadores soportados. Google Chrome, Mozilla Firefox, Safari y Microsoft Edge en sus dos últimas versiones estables, en escritorio y móvil (CA-07).

### Interfaces de comunicación

R-COM 1 Toda la comunicación entre el navegador y el servidor se realizará mediante HTTPS con TLS 1.2 o superior. Las solicitudes HTTP sin cifrar se redirigirán a HTTPS.

R-COM 2 El intercambio de datos entre el frontend y los servicios del backend se realizará en formato JSON sobre endpoints HTTP.

R-COM 3 La actualización en tiempo real de novedades, aulas y estado institucional se realizará mediante suscripciones WebSocket (Supabase Realtime). Si la conexión no está disponible, la aplicación consultará al servidor cada 30 segundos, de modo que la latencia no supere los 60 segundos (RNF-02).

R-COM 4 El envío de correos se realizará mediante la API HTTPS de Resend, desde un dominio con registros SPF, DKIM y DMARC configurados para reducir la clasificación como spam (Riesgo 20).

## Requisitos funcionales

Los requisitos funcionales se especifican en lenguaje natural estructurado, con el formulario de la plantilla. Se agrega la fila “Trazabilidad”, que vincula cada requisito con su criterio de aceptación, el módulo o entregable de la EDT y el interesado dueño del requisito.

### RF-01 – Registro de apertura y cierre de la institución

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                           RF-01                                                                                                                                                                                                                                                            |
|  Requisito:   |                                                                                                                                                                                     El sistema permitirá al bedel registrar la apertura y el cierre de la institución, y las novedades institucionales que afecten su funcionamiento.                                                                                                                                                                                      |
|  Prioridad:   |                                                                                                                                                                                                                                                            Alta                                                                                                                                                                                                                                                            |
|   Entrada:    |                                                                                                                                          Estado (Abierta, Cerrada, Abierta con novedades), fecha y hora (se proponen la fecha y hora actuales), motivo o descripción (obligatorio para “Cerrada” y “Abierta con novedades”; máximo 280 caracteres), vigencia estimada (opcional).                                                                                                                                          |
|   Proceso:    | 1\. El bedel selecciona el nuevo estado institucional y completa los datos.2. El sistema valida que el estado sea distinto al vigente y que el motivo esté completo cuando corresponda.3. El sistema registra el cambio con fecha, hora y usuario responsable, y conserva el estado anterior en el historial.4. El sistema publica el nuevo estado a todos los perfiles en tiempo real.5. Si el estado es “Cerrada” o “Abierta con novedades”, el sistema ofrece al bedel generar un aviso institucional asociado (RF-14). |
|    Salida:    |                                                                                                                                               Estado institucional actualizado y visible para todos los perfiles en menos de 60 segundos.Mensaje de confirmación al bedel.Mensaje de error si faltan datos obligatorios o si el estado seleccionado coincide con el vigente.                                                                                                                                               |
| Trazabilidad: |                                                                                                                                                                                            CA-01 · Módulo de Avisos Institucionales (EDT 3.4) · Interesados: Bedeles, Autoridades académicas, Personal de Seguridad / Portería.                                                                                                                                                                                            |

### RF-02 – Gestión de aulas y espacios

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                             RF-02                                                                                                                                                                                                                                                                                                                              |
|  Requisito:   |                                                                                                                                                                                                                                                     El sistema permitirá al bedel dar de alta, modificar, consultar y dar de baja aulas, registrando su capacidad, equipamiento, estado y disponibilidad.                                                                                                                                                                                                                                                      |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                              Alta                                                                                                                                                                                                                                                                                                                              |
|   Entrada:    |                                                                                                                                                                                    Código o nombre del aula (único), ubicación (edificio y piso), capacidad (entero entre 1 y 500), equipamiento (proyector, pantalla, computadora, climatización, ventilación, pizarra, conectividad), estado (Disponible, Ocupada, Fuera de servicio, En mantenimiento) y observaciones.                                                                                                                                                                                     |
|   Proceso:    | 1\. El bedel accede al listado de aulas y elige crear, editar o dar de baja un aula.2. El sistema valida que el código sea único, que la capacidad sea un entero dentro del rango y que los campos obligatorios estén completos.3. El sistema registra la operación con fecha, hora y usuario responsable.4. Si el aula pasa a “Fuera de servicio” o “En mantenimiento” y tiene clases asignadas, el sistema advierte al bedel y lista las clases afectadas para su reasignación (RF-16).5. La baja es lógica: el aula deja de ofrecerse para asignaciones y se conserva en el historial.6. Los cambios de estado y disponibilidad se publican en tiempo real. |
|    Salida:    |                                                                                                                                                                                 Aula registrada o actualizada y visible en los listados de disponibilidad en menos de 60 segundos.Mensaje de confirmación de la operación.Mensaje de error ante código duplicado, capacidad inválida o datos incompletos.Listado de clases afectadas cuando un aula deja de estar disponible.                                                                                                                                                                                  |
| Trazabilidad: |                                                                                                                                                                                                                                                                                CA-03 · Módulo de Aulas y Espacios (EDT 3.2) · Interesados: Bedeles, Personal de Mantenimiento.                                                                                                                                                                                                                                                                                 |

### RF-03 – Generación del código QR de asistencia docente

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :-----------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                   RF-03                                                                                                                                                                                                                                                                                                                                   |
|  Requisito:   |                                                                                                                                                                                                                                         El sistema generará un código QR de validación de asistencia docente, vinculado a fecha, aula y turno, que solo pueda ser utilizado dentro de la institución y por perfiles autorizados.                                                                                                                                                                                                                                          |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                   Alta                                                                                                                                                                                                                                                                                                                                    |
|   Entrada:    |                                                                                                                                                                                                                                                                                     Aula, fecha (por defecto, la actual) y turno (Mañana, Tarde, Noche), seleccionados por el bedel.                                                                                                                                                                                                                                                                                      |
|   Proceso:    | 1\. El bedel selecciona el aula y el turno para los que generará el QR.2. El sistema verifica que la institución esté en estado “Abierta” o “Abierta con novedades” y que el aula tenga clases programadas en ese turno.3. El sistema genera un token firmado y de un solo uso por docente, que contiene el aula, la fecha, el turno y un momento de expiración, y lo codifica como QR.4. El QR se renueva automáticamente cada 60 segundos mientras la pantalla permanece abierta, para impedir el uso de fotografías o capturas reenviadas. Deja de ser válido al finalizar el turno.5. El sistema registra la generación del QR con fecha, hora y usuario responsable. |
|    Salida:    |                                                                                                                                                                                                                                             Código QR vigente en pantalla, con aula, turno y tiempo restante de validez.Mensaje de error si la institución está cerrada o si el aula no tiene clases programadas en el turno.                                                                                                                                                                                                                                             |
| Trazabilidad: |                                                                                                                                                                                                                                                                                        CA-02 · Módulo de Actividad Docente (EDT 3.3) · Riesgo 15 · Interesados: Bedeles, Docentes.                                                                                                                                                                                                                                                                                        |

### RF-04 – Registro de asistencia docente mediante QR

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                 RF-04                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|  Requisito:   |                                                                                                                                                                                                                                                                                                                                                                                                     El sistema permitirá al docente registrar su asistencia escaneando, desde su dispositivo, el código QR generado por el bedel.                                                                                                                                                                                                                                                                                                                                                                                                      |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                  Alta                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|   Entrada:    |                                                                                                                                                                                                                                                                                                                                                                                         Token leído del código QR, identidad del docente autenticado, ubicación del dispositivo (latitud/longitud y precisión) o dirección IP de la conexión.                                                                                                                                                                                                                                                                                                                                                                                          |
|   Proceso:    | 1\. El docente autenticado abre la opción “Registrar asistencia” y el sistema activa la cámara.2. El sistema decodifica el QR y verifica que la firma sea válida y el token no esté vencido.3. El sistema verifica que el docente esté asignado a una comisión con clase programada en el aula y turno del QR.4. El sistema verifica que el dispositivo esté dentro de la institución: ubicación dentro de un radio configurable (100 m por defecto) del edificio o conexión desde la red institucional.5. Si todas las validaciones son correctas, registra la asistencia con fecha, hora, aula, comisión y docente, y cambia el estado de la clase a “Docente presente”.6. El sistema no almacena las coordenadas del dispositivo: solo guarda el resultado de la validación (dentro / fuera de la institución).7. Si el docente ya registró su asistencia para esa clase, el sistema informa el registro existente y no lo duplica. |
|    Salida:    |                                                                                                                                                                                                                                                                                 Confirmación en pantalla con el detalle de la asistencia registrada.Estado “Docente presente” visible para los estudiantes de la comisión en menos de 60 segundos.Mensajes de error específicos: QR vencido o inválido; docente sin clase en ese aula y turno; ubicación fuera de la institución; permisos de cámara o ubicación denegados; asistencia ya registrada.                                                                                                                                                                                                                                                                                  |
| Trazabilidad: |                                                                                                                                                                                                                                                                                                                                                                                                                      CA-02 · Módulo de Actividad Docente (EDT 3.3) · Interesados: Docentes, Bedeles, Estudiantes.                                                                                                                                                                                                                                                                                                                                                                                                                      |

### RF-05 – Publicación de novedades de clase

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| :-----------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      RF-05                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|  Requisito:   |                                                                                                                                                                                                                                                                                                                                                                                         El sistema permitirá al docente publicar, modificar y dar por finalizadas novedades sobre sus clases: ausencia, demora, cambio de modalidad (presencial/virtual), suspensión o cambio de aula.                                                                                                                                                                                                                                                                                                                                                                                          |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      Alta                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|   Entrada:    |                                                                                                                                                                                                                                                                                                                                                 Clase o clases afectadas (una comisión y fecha, o un rango de fechas), tipo de novedad, datos según el tipo (minutos estimados de demora; enlace a la clase virtual; aula nueva, elegida entre las disponibles), mensaje opcional para los estudiantes (máximo 500 caracteres).                                                                                                                                                                                                                                                                                                                                                 |
|   Proceso:    | 1\. El docente selecciona una o más de sus clases programadas y el tipo de novedad.2. El sistema valida que las clases pertenezcan al docente y no hayan finalizado, y que se completen los datos obligatorios del tipo (por ejemplo, un enlace válido para “Virtual” o un aula disponible para “Cambio de aula”).3. Para “Cambio de aula”, el sistema verifica la disponibilidad del aula nueva en ese horario y, si está libre, la reserva (RF-16).4. El sistema registra la novedad con fecha, hora y usuario responsable, y actualiza el estado de la clase.5. El sistema publica la novedad en tiempo real y notifica por correo a los estudiantes que siguen la comisión y activaron las notificaciones (RF-17).6. El docente puede editar o dar por finalizada una novedad. Cada modificación queda en el historial.7. La novedad no expone el motivo personal de una ausencia: los estudiantes solo ven el tipo de novedad y el mensaje que el docente decida publicar. |
|    Salida:    |                                                                                                                                                                                                                                                                                                                                               Novedad publicada y visible para los estudiantes de la comisión en menos de 60 segundos.Correo de notificación a los estudiantes suscriptos.Mensaje de confirmación al docente.Mensaje de error ante datos incompletos, enlace inválido, aula no disponible o clase ya finalizada.                                                                                                                                                                                                                                                                                                                                                |
| Trazabilidad: |                                                                                                                                                                                                                                                                                                                                                                                                                                             CA-03 · Módulo de Novedades (EDT 3.1) · Riesgo 16 · Interesados: Docentes, Estudiantes.                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### RF-06 – Solicitud y selección de aula por el docente

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                                                                                   RF-06                                                                                                                                                                                                                                                                                                                                                                                                   |
|  Requisito:   |                                                                                                                                                                                                                                                                                                                  El sistema permitirá al docente buscar aulas disponibles según la cantidad estimada de alumnos y los recursos requeridos, y solicitar o seleccionar una para su clase.                                                                                                                                                                                                                                                                                                                   |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                                                                                   Media                                                                                                                                                                                                                                                                                                                                                                                                   |
|   Entrada:    |                                                                                                                                                                                                                                                                                                           Clase o comisión, fecha y franja horaria, cantidad estimada de alumnos (entero mayor que 0), recursos requeridos (proyector, computadora, climatización, etc.) y comentario opcional.                                                                                                                                                                                                                                                                                                           |
|   Proceso:    | 1\. El docente indica la fecha, la franja horaria, la cantidad de alumnos y los recursos requeridos.2. El sistema filtra las aulas en estado “Disponible”, sin asignaciones superpuestas en esa franja, con capacidad mayor o igual a la cantidad indicada y con todos los recursos requeridos.3. El sistema ordena los resultados por la capacidad más ajustada a la cantidad de alumnos.4. El docente selecciona un aula y confirma la solicitud.5. La solicitud queda “Pendiente” para su aprobación por bedelía (RF-16). Si la clase no tiene aula asignada y la franja comienza en menos de 30 minutos, la asignación es inmediata y se informa a bedelía.6. Si no hay aulas que cumplan los criterios, el sistema informa los criterios que no se cumplen y sugiere aulas que cumplen parcialmente. |
|    Salida:    |                                                                                                                                                                                                                                                                                    Listado de aulas disponibles que cumplen los filtros, actualizado al momento de la consulta.Solicitud registrada con su estado (Pendiente / Asignada).Mensaje informativo si no hay aulas disponibles con los criterios indicados.                                                                                                                                                                                                                                                                                     |
| Trazabilidad: |                                                                                                                                                                                                                                                                                                                                                              CA-04 · Módulo de Aulas y Espacios (EDT 3.2) · Interesados: Docentes, Bedeles.                                                                                                                                                                                                                                                                                                                                                               |

### RF-07 – Consulta del estado de clases por el estudiante

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :-----------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                            RF-07                                                                                                                                                                                                                                                                            |
|  Requisito:   |                                                                                                                                                                                 El sistema permitirá al estudiante consultar en tiempo real el estado de sus clases (aula asignada, presencia docente y novedades activas), filtrando por carrera, año, comisión y materia.                                                                                                                                                                                 |
|  Prioridad:   |                                                                                                                                                                                                                                                                            Alta                                                                                                                                                                                                                                                                             |
|   Entrada:    |                                                                                                                                                                                        Filtros opcionales y combinables: carrera, año, comisión, materia y fecha (por defecto, hoy). Si el estudiante configuró comisiones seguidas (RF-17), se aplican por defecto.                                                                                                                                                                                        |
|   Proceso:    | 1\. El estudiante accede a “Mis clases” o a la búsqueda de clases.2. El sistema aplica los filtros seleccionados, en forma combinada, sobre las clases programadas.3. Por cada clase, el sistema muestra materia, comisión, horario, aula asignada, estado del docente (Sin registrar / Presente / Demorado / Ausente) y novedades activas.4. La vista se actualiza automáticamente ante cualquier cambio, sin que el estudiante recargue la página.5. Si la institución está cerrada, el sistema lo indica de forma destacada antes del listado de clases. |
|    Salida:    |                                                                                                                                                                                                 Listado de clases con su estado actualizado (latencia máxima de 60 segundos).Mensaje “No se encontraron clases” si ninguna clase coincide con los filtros.                                                                                                                                                                                                  |
| Trazabilidad: |                                                                                                                                                                                                                               CA-03, CA-04 · Módulo de Novedades (EDT 3.1) · Interesados: Estudiantes, Centro de Estudiantes.                                                                                                                                                                                                                               |

### RF-08 – Visualización del estado institucional

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                 RF-08                                                                                                                                                                                                                  |
|  Requisito:   |                                                                                                                                         El sistema mostrará a los estudiantes, y a todos los perfiles, el estado general de la institución: abierta, cerrada o con novedades institucionales.                                                                                                                                          |
|  Prioridad:   |                                                                                                                                                                                                                  Alta                                                                                                                                                                                                                  |
|   Entrada:    |                                                                                                                                                                 Estado institucional vigente registrado por bedelía (RF-01) y avisos institucionales activos (RF-14).                                                                                                                                                                  |
|   Proceso:    | 1\. Al ingresar al sistema, se muestra el indicador de estado institucional en la parte superior de todas las pantallas.2. El indicador muestra el estado, la fecha y hora de la última actualización y, si corresponde, el motivo.3. Ante un cambio de estado, el indicador se actualiza automáticamente en todas las sesiones abiertas.4. Al seleccionar el indicador, se accede al detalle y a los avisos institucionales vigentes. |
|    Salida:    |                                                                                                                                                                 Indicador de estado institucional actualizado en menos de 60 segundos después de la acción del bedel.                                                                                                                                                                  |
| Trazabilidad: |                                                                                                                                                                         CA-01, CA-03 · Módulo de Avisos Institucionales (EDT 3.4) · Interesados: Estudiantes.                                                                                                                                                                          |

### RF-09 – Consultas históricas para autoridades

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                     RF-09                                                                                                                                                                                                                                                      |
|  Requisito:   |                                                                                                                                                               El sistema permitirá a las autoridades académicas consultar información histórica consolidada sobre asistencia docente, novedades, uso de aulas e incidencias de infraestructura.                                                                                                                                                                |
|  Prioridad:   |                                                                                                                                                                                                                                                     Media                                                                                                                                                                                                                                                      |
|   Entrada:    |                                                                                                                                           Tipo de consulta (asistencia docente, novedades, uso de aulas, incidencias), rango de fechas (obligatorio, máximo 12 meses por consulta) y filtros opcionales: carrera, materia, comisión, docente, aula y tipo de evento.                                                                                                                                           |
|   Proceso:    | 1\. La autoridad selecciona el tipo de consulta y los filtros.2. El sistema valida que el rango de fechas sea correcto (fecha desde menor o igual que fecha hasta, no mayor a 12 meses).3. El sistema obtiene los registros históricos y calcula indicadores resumidos: porcentaje de asistencia docente, cantidad de novedades por tipo, porcentaje de ocupación de aulas e incidencias abiertas y resueltas.4. El sistema muestra el detalle paginado, con fecha, hora y usuario responsable de cada evento. |
|    Salida:    |                                                                                                                                                                Indicadores resumidos y listado detallado de los eventos del período.Mensaje “Sin registros para el período” si no hay datos.Mensaje de error ante un rango de fechas inválido.                                                                                                                                                                 |
| Trazabilidad: |                                                                                                                                                                                                    CA-06 · Registro histórico (EDT 3.1 a 3.4) · Interesados: Autoridades académicas, Directora de Carrera.                                                                                                                                                                                                     |

### RF-10 – Gestión de usuarios y perfiles

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :-----------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                                                                                                                                  RF-10                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|  Requisito:   |                                                                                                                                                                                                                                                                                                                                            El sistema gestionará cuatro perfiles de usuario con permisos diferenciados (estudiante, docente, bedel y autoridad académica) y permitirá dar de alta, modificar, desactivar y asignar perfiles a los usuarios.                                                                                                                                                                                                                                                                                                                                             |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                                                                                                                                  Alta                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
|   Entrada:    |                                                                                                                                                                                                                                                                                                                                                                       Apellido y nombre, DNI (7 u 8 dígitos), correo electrónico, legajo (opcional para estudiantes y docentes), perfil, y comisiones asignadas (para docentes).                                                                                                                                                                                                                                                                                                                                                                        |
|   Proceso:    | 1\. El usuario con permiso de administración (bedel o autoridad académica) crea o edita un usuario.2. El sistema valida el formato del correo (usuario@dominio), que el DNI sea numérico de 7 u 8 dígitos y que el correo y el DNI no estén registrados.3. El sistema asigna el perfil y sus permisos según la matriz del Apéndice C.4. En el alta, el sistema envía al usuario un correo con un enlace para definir su contraseña, válido por 24 horas.5. La desactivación es lógica: el usuario no puede iniciar sesión, pero sus registros históricos se conservan.6. Los estudiantes también pueden registrarse por su cuenta con su correo; el perfil “Estudiante” es el único asignable sin intervención de un administrador.7. En cada solicitud, el sistema verifica en el servidor que el perfil del usuario tenga permiso para la operación, sin depender solo de lo que muestra la interfaz. |
|    Salida:    |                                                                                                                                                                                                                                                                                                                                    Usuario registrado o actualizado con su perfil.Correo de activación enviado.Mensaje de error ante correo o DNI duplicados o con formato inválido.Respuesta “Acceso denegado” cuando un perfil intenta una operación no permitida.                                                                                                                                                                                                                                                                                                                                    |
| Trazabilidad: |                                                                                                                                                                                                                                                                                                                                                                                                       CA-05 · Módulo de Gestión de Usuarios y Roles (EDT 3.1.3) · Riesgo 14 · Interesados: Todos.                                                                                                                                                                                                                                                                                                                                                                                                       |

### RF-11 – Autenticación de usuarios

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                                                        RF-11                                                                                                                                                                                                                                                                                                                                         |
|  Requisito:   |                                                                                                                                                                                                                                                                               El sistema requerirá que el usuario inicie sesión con sus credenciales para acceder a cualquier funcionalidad protegida.                                                                                                                                                                                                                                                                               |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                                                         Alta                                                                                                                                                                                                                                                                                                                                         |
|   Entrada:    |                                                                                                                                                                                                                                                                                                                           Correo electrónico y contraseña.                                                                                                                                                                                                                                                                                                                           |
|   Proceso:    | 1\. El usuario ingresa su correo y contraseña.2. El sistema verifica las credenciales contra el hash almacenado y que el usuario esté activo.3. Si son correctas, genera una sesión (JWT) con el identificador y el perfil del usuario, con un vencimiento de 8 horas de inactividad.4. Si son incorrectas, informa un error genérico, sin indicar cuál de los datos falló. Tras 5 intentos fallidos consecutivos, bloquea temporalmente la cuenta durante 15 minutos.5. Todo intento de acceder a una ruta protegida sin sesión válida redirige a la pantalla de inicio de sesión.6. El usuario puede cerrar la sesión en cualquier momento; al hacerlo, el token queda invalidado. |
|    Salida:    |                                                                                                                                                                                                                                                                       Acceso al panel principal del perfil.Mensaje “Correo o contraseña incorrectos”.Mensaje de cuenta bloqueada temporalmente o desactivada.                                                                                                                                                                                                                                                                        |
| Trazabilidad: |                                                                                                                                                                                                                                                                                   CA-05 · Módulo de Gestión de Usuarios y Roles (EDT 3.1.3) · Interesados: Todos, Departamento de Sistemas / TIC.                                                                                                                                                                                                                                                                                    |

### RF-12 – Recuperación de contraseña

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| :-----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                   RF-12                                                                                                                                                                                                                                                                    |
|  Requisito:   |                                                                                                                                                                                                          El sistema permitirá al usuario restablecer su contraseña mediante un enlace enviado a su correo electrónico registrado.                                                                                                                                                                                                          |
|  Prioridad:   |                                                                                                                                                                                                                                                                   Media                                                                                                                                                                                                                                                                    |
|   Entrada:    |                                                                                                                                                                                                                                       Correo electrónico; luego, nueva contraseña y su confirmación.                                                                                                                                                                                                                                       |
|   Proceso:    | 1\. El usuario selecciona “Olvidé mi contraseña” e ingresa su correo.2. El sistema responde siempre con el mismo mensaje, esté o no registrado el correo, para no revelar qué cuentas existen.3. Si el correo está registrado y activo, envía un enlace de un solo uso válido por 60 minutos.4. Al usar el enlace, el usuario define una nueva contraseña, que debe cumplir la política de RNF-SEG 3 y coincidir con su confirmación.5. El sistema actualiza la contraseña, invalida el enlace y cierra las sesiones abiertas del usuario. |
|    Salida:    |                                                                                                                                                      Mensaje “Si el correo está registrado, recibirás un enlace”.Correo con enlace de restablecimiento.Confirmación de contraseña actualizada, o mensaje de error ante un enlace vencido o una contraseña que no cumple la política.                                                                                                                                                       |
| Trazabilidad: |                                                                                                                                                                                                                              CA-05 · Módulo de Gestión de Usuarios y Roles (EDT 3.1.3) · Interesados: Todos.                                                                                                                                                                                                                               |

### RF-13 – Gestión de datos académicos base

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :-----------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                    RF-13                                                                                                                                                                                                                                                                    |
|  Requisito:   |                                                                                                                                                                                    El sistema permitirá al bedel cargar y mantener los datos académicos base: carreras, materias, comisiones, horarios de cursado y docentes asignados a cada comisión.                                                                                                                                                                                     |
|  Prioridad:   |                                                                                                                                                                                                                                                                    Alta                                                                                                                                                                                                                                                                     |
|   Entrada:    |                                                                                                                                                 Carrera (código, nombre); materia (código, nombre, carrera, año de la carrera); comisión (código, materia, turno, año lectivo, cuatrimestre o anual); horario (día de la semana, hora de inicio y fin, aula habitual); docentes asignados.                                                                                                                                                  |
|   Proceso:    | 1\. El bedel crea o edita carreras, materias y comisiones.2. El sistema valida la unicidad de los códigos, que la hora de fin sea posterior a la de inicio y que el docente asignado tenga perfil “Docente”.3. Al registrar un horario con aula habitual, el sistema verifica que el aula no tenga otra comisión en esa franja (RF-16).4. A partir de los horarios, el sistema genera las clases programadas del período lectivo, excluyendo los días no laborables que cargue el bedel.5. Cada operación queda registrada en el historial. |
|    Salida:    |                                                                                                                                                                                              Datos académicos registrados y clases programadas generadas.Mensaje de error ante códigos duplicados, horarios inválidos o superposición de aula.                                                                                                                                                                                              |
| Trazabilidad: |                                                                                                                                                                                               CA-09 · Módulo de Aulas y Espacios / Gestión de Usuarios (EDT 3.1–3.2) · Interesados: Secretaría Académica, Bedeles, Coordinadores de Cátedra.                                                                                                                                                                                                |

### RF-14 – Publicación de avisos institucionales y notificación

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-----------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                                RF-14                                                                                                                                                                                                                                                                                                 |
|  Requisito:   |                                                                                                                                                                                                            El sistema permitirá a bedeles y autoridades académicas publicar avisos institucionales dirigidos a toda la comunidad o a un segmento, y notificarlos por correo electrónico.                                                                                                                                                                                                             |
|  Prioridad:   |                                                                                                                                                                                                                                                                                                 Alta                                                                                                                                                                                                                                                                                                 |
|   Entrada:    |                                                                                                                                                                                Título (máximo 100 caracteres), cuerpo (máximo 2.000 caracteres), prioridad (Normal / Urgente), destinatarios (todos, o segmentados por perfil, carrera, año o comisión), fecha de vigencia desde/hasta, opción de enviar por correo.                                                                                                                                                                                 |
|   Proceso:    | 1\. El usuario redacta el aviso y selecciona los destinatarios.2. El sistema valida los campos obligatorios y que la vigencia sea coherente.3. El sistema publica el aviso en la sección Avisos de los destinatarios; los avisos urgentes se muestran también junto al indicador de estado institucional.4. Si se eligió enviar por correo, el sistema envía el aviso a los destinatarios mediante Resend (a los estudiantes, según sus preferencias de RF-17) y registra el resultado de cada envío.5. Al vencer la vigencia, el aviso deja de mostrarse como activo y se conserva en el historial. |
|    Salida:    |                                                                                                                                                                                                              Aviso visible para los destinatarios en menos de 60 segundos.Correos enviados y registro de entregas fallidas.Mensaje de error ante datos incompletos o vigencia inválida.                                                                                                                                                                                                              |
| Trazabilidad: |                                                                                                                                                                                                                            CA-03 · Módulo de Avisos Institucionales y Notificaciones (EDT 3.4) · Riesgo 20 · Interesados: Autoridades de Facultad, Bedeles, Estudiantes.                                                                                                                                                                                                                             |

### RF-15 – Registro y seguimiento de incidencias de infraestructura

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                 RF-15                                                                                                                                                                                                                                 |
|  Requisito:   |                                                                                                                                                   El sistema permitirá a docentes y bedeles reportar incidencias de infraestructura o equipamiento de un aula, y a bedelía gestionar su estado hasta su resolución.                                                                                                                                                   |
|  Prioridad:   |                                                                                                                                                                                                                                 Media                                                                                                                                                                                                                                 |
|   Entrada:    |                                                                                                                       Aula, elemento afectado (proyector, climatización, iluminación, mobiliario, conectividad, otro), descripción (máximo 500 caracteres), gravedad (Leve / Impide el uso del aula) y foto opcional (JPG o PNG, máximo 5 MB).                                                                                                                        |
|   Proceso:    | 1\. El docente o el bedel registra la incidencia.2. El sistema valida los datos y el formato y tamaño de la foto.3. El sistema registra la incidencia en estado “Abierta” con fecha, hora y usuario.4. Si la gravedad es “Impide el uso del aula”, el sistema propone al bedel cambiar el aula a “Fuera de servicio” (RF-02).5. El bedel actualiza el estado (Abierta → En curso → Resuelta) y agrega observaciones. Al resolverse, puede volver a habilitar el aula. |
|    Salida:    |                                                                                                                                          Incidencia registrada y visible en el listado de bedelía y en el detalle del aula.Historial de estados de la incidencia.Mensaje de error ante datos incompletos o archivo inválido.                                                                                                                                          |
| Trazabilidad: |                                                                                                                                                                             CA-06 · Módulo de Aulas y Espacios (EDT 3.2) · Interesados: Bedeles, Personal de Mantenimiento, Autoridades.                                                                                                                                                                              |

### RF-16 – Asignación de aulas y aprobación de solicitudes

|               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :-----------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                                                                                                 RF-16                                                                                                                                                                                                                                                                                 |
|  Requisito:   |                                                                                                                                                                                          El sistema permitirá al bedel asignar aulas a clases y aprobar o rechazar las solicitudes de los docentes, e impedirá asignar una misma aula a dos clases en franjas superpuestas.                                                                                                                                                                                           |
|  Prioridad:   |                                                                                                                                                                                                                                                                                 Alta                                                                                                                                                                                                                                                                                  |
|   Entrada:    |                                                                                                                                                                                                                       Solicitud pendiente (RF-06) o clase a asignar, aula, decisión (Aprobar / Rechazar) y motivo (obligatorio si se rechaza).                                                                                                                                                                                                                        |
|   Proceso:    | 1\. El bedel consulta las solicitudes pendientes o las clases sin aula.2. Al aprobar o asignar, el sistema verifica, dentro de una misma transacción, que el aula siga disponible en esa franja; si otra operación la ocupó, rechaza la asignación.3. El sistema registra la asignación, actualiza la ocupación del aula y el aula de la clase.4. Si cambia el aula de una clase ya publicada, el sistema genera automáticamente una novedad de “Cambio de aula” (RF-05) visible para los estudiantes.5. El sistema notifica al docente el resultado de su solicitud. |
|    Salida:    |                                                                                                                                                                                   Aula asignada y ocupación actualizada en tiempo real.Notificación al docente (aprobada / rechazada con motivo).Mensaje de error “El aula ya está asignada en esa franja” ante una superposición.                                                                                                                                                                                    |
| Trazabilidad: |                                                                                                                                                                                                                                      CA-04 · Módulo de Aulas y Espacios (EDT 3.2) · Riesgo 17 · Interesados: Bedeles, Docentes.                                                                                                                                                                                                                                       |

### RF-17 – Preferencias de seguimiento y notificaciones del estudiante

|               |                                                                                                                                                                                                                                                                                                                                                                                                                |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                                                                     RF-17                                                                                                                                                                                                      |
|  Requisito:   |                                                                                                                El sistema permitirá al estudiante seleccionar las comisiones que sigue y configurar si desea recibir por correo las novedades de esas comisiones y los avisos institucionales.                                                                                                                 |
|  Prioridad:   |                                                                                                                                                                                                     Media                                                                                                                                                                                                      |
|   Entrada:    |                                                                                                                         Comisiones seleccionadas (búsqueda por carrera, año y materia), opción de notificaciones por correo de novedades (Sí/No) y de avisos institucionales (Sí/No).                                                                                                                          |
|   Proceso:    | 1\. El estudiante busca y agrega o quita comisiones de su lista.2. El sistema guarda las preferencias y las aplica como filtro por defecto en “Mis clases” (RF-07).3. Al publicarse una novedad en una comisión seguida (RF-05) o un aviso dirigido al estudiante (RF-14), el sistema envía el correo solo si el estudiante lo habilitó.4. Cada correo incluye un enlace para dejar de recibir notificaciones. |
|    Salida:    |                                                                                                                                                            Preferencias guardadas y confirmadas.“Mis clases” filtrado por las comisiones seguidas.                                                                                                                                                             |
| Trazabilidad: |                                                                                                                                                     CA-04 · Módulo de Avisos y Notificaciones (EDT 3.4) · Interesados: Estudiantes, Centro de Estudiantes.                                                                                                                                                     |

### RF-18 – Registro manual de asistencia docente (contingencia)

|               |                                                                                                                                                                                                                                                                                                                |
| :-----------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|  Referencia:  |                                                                                                                                                     RF-18                                                                                                                                                      |
|  Requisito:   |                                                                    El sistema permitirá al bedel registrar manualmente la asistencia de un docente cuando no sea posible usar el QR (por ejemplo, un dispositivo sin cámara o sin batería).                                                                    |
|  Prioridad:   |                                                                                                                                                     Media                                                                                                                                                      |
|   Entrada:    |                                                                                                             Docente, clase programada, hora de llegada y motivo del registro manual (obligatorio).                                                                                                             |
|   Proceso:    | 1\. El bedel selecciona la clase y el docente presente.2. El sistema verifica que no exista un registro de asistencia previo para esa clase.3. El sistema registra la asistencia marcada como “Registro manual”, con el motivo y el bedel responsable, y actualiza el estado de la clase a “Docente presente”. |
|    Salida:    |                                                                          Asistencia registrada, diferenciada de las registradas por QR en las consultas históricas (RF-09).Mensaje de error si ya existe un registro para esa clase.                                                                           |
| Trazabilidad: |                                                                                                                CA-06 · Módulo de Actividad Docente (EDT 3.3) · Interesados: Bedeles, Docentes.                                                                                                                 |

## Requisitos de datos

El sistema debe almacenar la siguiente información. El diccionario de datos detallado (tipos, restricciones e índices) se desarrollará en los paquetes 2.2.1 Diagrama de entidades y 2.2.2 Diseño de Base de Datos de la EDT.

|          Entidad          |                  Descripción                   |                                                            Datos principales                                                             |
| :-----------------------: | :--------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------------------------: |
|          Usuario          |         Persona que accede al sistema.         |            Id, apellido, nombre, DNI, correo (único), legajo, perfil, estado (activo/inactivo), fecha de alta, último acceso.            |
|     Perfil / Permiso      |   Rol del usuario y operaciones habilitadas.   |                                   Perfil (Estudiante, Docente, Bedel, Autoridad), permisos asociados.                                    |
|          Carrera          |           Carrera de la institución.           |                                                             Código, nombre.                                                              |
|          Materia          |           Asignatura de una carrera.           |                                               Código, nombre, carrera, año de la carrera.                                                |
|         Comisión          |        Grupo de cursado de una materia.        |                                    Código, materia, turno, año lectivo, período, docentes asignados.                                     |
|          Horario          |   Franja semanal de cursado de una comisión.   |                                 Comisión, día de la semana, hora de inicio, hora de fin, aula habitual.                                  |
|     Clase programada      |       Instancia de dictado en una fecha.       |                        Comisión, fecha, hora de inicio y fin, aula asignada, modalidad, estado (ver Apéndice D).                         |
|           Aula            |           Espacio físico de dictado.           |                        Código (único), ubicación, capacidad, equipamiento, estado, observaciones, activa (sí/no).                        |
|     Solicitud de aula     |         Pedido de aula de un docente.          |                Docente, clase, fecha y franja, cantidad de alumnos, recursos, aula solicitada, estado, motivo de rechazo.                |
|   Estado institucional    |    Situación de apertura de la institución.    |                                       Estado, motivo, fecha y hora, vigencia, usuario responsable.                                       |
|       Sesión de QR        |         Código de asistencia generado.         |                                  Aula, fecha, turno, token firmado (hash), expiración, bedel generador.                                  |
|    Asistencia docente     |      Registro de presencia de un docente.      | Docente, clase, fecha y hora, método (QR / manual), resultado de la validación de ubicación, motivo (si es manual), usuario registrante. |
|          Novedad          |          Información sobre una clase.          |        Clase(s), tipo, minutos de demora, enlace virtual, aula nueva, mensaje, estado (activa/finalizada), docente, fecha y hora.        |
|    Aviso institucional    |              Comunicado oficial.               |                       Título, cuerpo, prioridad, segmento de destinatarios, vigencia, autor, fecha de publicación.                       |
|       Notificación        | Envío de correo asociado a un aviso o novedad. |                                 Destinatario, referencia al aviso o novedad, fecha de envío, resultado.                                  |
|        Incidencia         |    Problema de infraestructura de un aula.     |                      Aula, elemento, descripción, gravedad, foto, estado, historial de estados, usuario informante.                      |
| Preferencia de estudiante |         Configuración de seguimiento.          |                                        Estudiante, comisiones seguidas, opciones de notificación.                                        |
|   Registro de auditoría   |          Evento trazable del sistema.          |                          Fecha y hora, usuario, perfil, acción, entidad afectada, valores anteriores y nuevos.                           |

Reglas generales de datos:

Las fechas y horas se almacenan en UTC y se muestran en la zona horaria de Argentina (UTC−3), con formato dd/mm/aaaa hh:mm.

Las bajas son lógicas en todas las entidades con historial asociado (usuarios, aulas, comisiones); no se eliminan registros físicamente.

Los registros de asistencia, novedades, estado institucional y auditoría no pueden modificarse ni eliminarse retroactivamente; las correcciones se registran como nuevos eventos (RNF-03).

Los datos históricos se conservan como mínimo durante dos ciclos lectivos.

## Atributos del Sistema - Requisitos no funcionales

Entre paréntesis se indica el requisito de la Matriz de Trazabilidad del que deriva cada requisito no funcional, cuando corresponde.

### Requisitos de eficiencia

RNF-EF 1 (RNF-02) Los cambios en novedades, aulas, asistencia docente y estado institucional serán visibles para todos los usuarios con sesión activa en un máximo de 60 segundos desde su registro. El objetivo de diseño es de 5 segundos en condiciones normales.

RNF-EF 2 El 95% de las consultas (listados de clases, aulas y avisos) se responderán en menos de 2 segundos, y el 95% de las operaciones de registro (novedad, asistencia, asignación) en menos de 3 segundos, con una conexión móvil 4G.

RNF-EF 3 El sistema soportará al menos 300 usuarios con sesión simultánea sin degradar los tiempos de RNF-EF 2, considerando el pico de uso en el inicio de los turnos.

RNF-EF 4 La validación completa de un registro de asistencia por QR (lectura, verificación y confirmación) no superará los 5 segundos desde la lectura del código.

RNF-EF 5 Las consultas históricas de un período de hasta 12 meses se resolverán en menos de 10 segundos.

RNF-EF 6 El almacenamiento de un ciclo lectivo de la carrera de ISI deberá mantenerse dentro de los límites del plan contratado de base de datos. Las fotos de incidencias se comprimirán a un máximo de 1 MB.

### Requisitos de usabilidad

RNF-US 1 Un estudiante que ingresa al sistema debe poder conocer el estado de sus clases del día en un máximo de 2 interacciones desde el inicio de sesión, sin capacitación previa.

RNF-US 2 Un docente debe poder publicar una novedad en menos de 1 minuto y en no más de 4 pasos.

RNF-US 3 Un bedel debe poder operar todas las funciones de su perfil después de una capacitación de 2 horas como máximo. Un docente, después de una demostración de 15 minutos o de leer la guía rápida.

RNF-US 4 Los usuarios no deberán memorizar comandos: todas las opciones estarán visibles en el menú del perfil, con etiquetas en español.

RNF-US 5 El sistema cumplirá el nivel AA de las pautas WCAG 2.1 en contraste de color, tamaño de elementos táctiles (mínimo 44×44 px) y navegación por teclado.

RNF-US 6 Toda operación mostrará un mensaje de confirmación o de error, claro y en español, que indique cómo corregir el problema.

RNF-US 7 El sistema incluirá un manual de usuario por perfil y una guía rápida accesible desde el menú de ayuda (EDT 4.1.1).

### Requisitos de fiabilidad

RNF-FIAB 1 El sistema estará disponible el 99% del tiempo durante el horario de funcionamiento de la institución (lunes a viernes de 7:00 a 23:30 y sábados de 7:00 a 14:00), medido mensualmente y excluyendo mantenimientos programados.

RNF-FIAB 2 Los mantenimientos programados se realizarán fuera del horario de funcionamiento y se anunciarán con al menos 24 horas de anticipación mediante un aviso institucional.

RNF-FIAB 3 Se realizarán copias de seguridad automáticas diarias de la base de datos, con una retención mínima de 7 días. La pérdida máxima de datos ante un fallo será de 24 horas (RPO).

RNF-FIAB 4 Ante un fallo del sistema, no se tardará más de 4 horas en restaurar los datos a un estado válido y volver a poner en marcha el servicio (RTO).

RNF-FIAB 5 Cada despliegue a producción contará con un procedimiento de reversión a la versión anterior que pueda ejecutarse en menos de 15 minutos (EDT 3.5.1).

RNF-FIAB 6 Las operaciones que modifican varios datos a la vez (asignación de aula con generación de novedad, registro de asistencia con cambio de estado de la clase) se ejecutarán de forma transaccional: se completan todas o ninguna.

### Requisitos de portabilidad

R-POR 1 (RNF-01) El sistema se ejecutará en navegadores web sin requerir instalación, en Windows, macOS, Linux, Android (10 o superior) e iOS (15 o superior).

R-POR 2 La base de datos usará PostgreSQL estándar, con migraciones versionadas, de modo que pueda trasladarse a otro proveedor o a la infraestructura del Departamento de Sistemas / TIC sin cambios en el modelo de datos.

R-POR 3 Las direcciones de servicios, claves y parámetros institucionales (ubicación y radio de validación, red institucional, turnos) se configurarán mediante variables de entorno o parámetros del sistema, sin modificar el código fuente.

### Requisitos de entrega

RNF-ENT 1 Los módulos se entregarán, con pruebas aprobadas, en las fechas de la Declaración del Alcance: Módulo de Novedades el 12/10/2026; Módulos de Aulas y Espacios, Actividad Docente y Avisos el 29/10/2026.

RNF-ENT 2 El MVP funcional, integrado, desplegado y validado se entregará el 10/11/2026.

RNF-ENT 3 La versión final, con manual de usuario, documentación técnica e informe final, se entregará antes del 18/11/2026.

RNF-ENT 4 Junto con el sistema se entregarán el código fuente en un repositorio Git, los scripts de migración de la base de datos, el plan de despliegue y la documentación de instalación y mantenimiento.

### Requisitos de implementación

RNF-IMP 1 La aplicación se desarrollará con Next.js, React y TypeScript. La base de datos será PostgreSQL sobre Supabase.

RNF-IMP 2 La autenticación se implementará con JWT y el control de acceso se aplicará en el servidor y mediante políticas RLS en la base de datos.

RNF-IMP 3 El código se gestionará en un repositorio Git con ramas por funcionalidad y revisión de código antes de integrar a la rama principal.

RNF-IMP 4 Se utilizará un pipeline de integración y despliegue continuo que ejecute automáticamente el análisis estático (linter), la verificación de tipos y las pruebas antes de cada despliegue a Vercel (EDT 3.3.3).

RNF-IMP 5 La lógica de negocio crítica (validación de QR, asignación de aulas, permisos por perfil) tendrá pruebas unitarias automatizadas.

RNF-IMP 6 Los cambios en la base de datos se realizarán solo mediante migraciones versionadas, aplicadas en el mismo orden en los entornos de desarrollo y producción (Riesgo 18).

### Requisitos de estándares

RNF-STD 1 Los requisitos del software se documentarán según el estándar IEEE 830-1998.

RNF-STD 2 El modelado del sistema se realizará con UML 2.x (casos de uso, clases, secuencia, estados y despliegue).

RNF-STD 3 La accesibilidad de la interfaz cumplirá WCAG 2.1 nivel AA.

RNF-STD 4 El desarrollo seguirá las recomendaciones de OWASP Top 10 para aplicaciones web.

RNF-STD 5 Las fechas intercambiadas entre componentes usarán el formato ISO 8601.

RNF-STD 6 La gestión del proyecto seguirá los lineamientos del PMBOK aplicados en la cátedra.

### Requisitos de interoperabilidad

RNF-INT 1 En esta versión, SiGA no se comunicará automáticamente con SIU-Guaraní ni con SYSACAD. El modelo de datos conservará identificadores externos (legajo, código de materia y comisión) para facilitar una integración futura.

RNF-INT 2 El sistema se comunicará con el servicio de correo Resend mediante su API HTTPS para enviar todas las notificaciones.

RNF-INT 3 Los servicios del backend se expondrán como endpoints HTTP con datos JSON, documentados, para permitir que otros sistemas institucionales los consuman en el futuro.

### Requisitos éticos

RNF-ETI 1 La información de asistencia docente se usará solo para comunicar el estado de las clases y generar estadísticas institucionales. El sistema no aplicará sanciones ni descuentos automáticos.

RNF-ETI 2 El sistema no publicará los motivos personales de la ausencia de un docente; los estudiantes solo verán el tipo de novedad y el mensaje que el docente decida compartir.

RNF-ETI 3 El sistema no realizará seguimiento continuo de la ubicación: la geolocalización se consulta solo al momento de escanear el QR, con consentimiento explícito, y no se almacenan las coordenadas.

RNF-ETI 4 La información publicada por SiGA será la fuente oficial y equitativa para todos los estudiantes, sin depender de grupos informales ni de contactos personales (ODS 10).

### Requisitos de privacidad

RNF-PRI 1 (RNF-04) El sistema cumplirá la Ley 25.326 de Protección de los Datos Personales en el tratamiento de los datos de todos los usuarios (CA-08).

RNF-PRI 2 El sistema recolectará solo los datos personales necesarios para su funcionamiento (minimización) e informará su finalidad en una política de privacidad, que el usuario acepta en su primer ingreso.

RNF-PRI 3 El sistema aplicará niveles de privilegio: los estudiantes solo verán el nombre del docente y el estado de sus clases; el DNI, el correo y los registros de asistencia solo serán visibles para bedeles y autoridades.

RNF-PRI 4 El sistema permitirá ejercer los derechos de acceso, rectificación y supresión: cada usuario podrá consultar y corregir sus datos de perfil y solicitar la baja de su cuenta.

RNF-PRI 5 Los datos personales no se compartirán con terceros, excepto con los proveedores de infraestructura necesarios para operar el sistema (Supabase, Vercel, Resend).

### Requisitos de seguridad y protección

RNF-SEG 1 Cada usuario deberá autenticarse con correo electrónico y contraseña; el sistema verificará el acceso en cada solicitud (RF-11).

RNF-SEG 2 Las contraseñas se almacenarán únicamente como hash con un algoritmo adaptativo y sal (bcrypt o argon2). Nunca se almacenarán ni transmitirán en texto plano.

RNF-SEG 3 Las contraseñas tendrán al menos 8 caracteres e incluirán letras y números.

RNF-SEG 4 El control de acceso por perfil se aplicará en el servidor y en la base de datos (RLS). Un perfil no podrá acceder a datos ni operaciones de otro perfil aunque manipule la interfaz o las solicitudes (CA-05, Riesgo 14).

RNF-SEG 5 Los tokens de QR estarán firmados digitalmente en el servidor, tendrán una vigencia máxima de 60 segundos por código mostrado y no podrán reutilizarse (CA-02).

RNF-SEG 6 (RNF-03) Todos los eventos relevantes (inicios de sesión, asistencias, novedades, cambios de aula, estado institucional, altas y cambios de usuarios) se registrarán en un registro de auditoría con fecha, hora y usuario responsable. Ningún perfil podrá modificarlo ni eliminarlo.

RNF-SEG 7 Todas las entradas se validarán en el servidor para prevenir inyección SQL, XSS y CSRF. Los archivos subidos se limitarán a imágenes JPG o PNG de hasta 5 MB.

RNF-SEG 8 Las claves de servicios externos y secretos de firma se almacenarán en variables de entorno del servidor y nunca se expondrán en el código del navegador ni en el repositorio.

RNF-SEG 9 El sistema limitará la cantidad de solicitudes por usuario en los endpoints de inicio de sesión, recuperación de contraseña y registro de asistencia, para mitigar ataques de fuerza bruta.

# Apéndices

Apéndice A – Matriz de trazabilidad de requisitos funcionales

| Req.  |                Descripción breve                | Prioridad |        Entregable / EDT        |      CA      |
| :---: | :---------------------------------------------: | :-------: | :----------------------------: | :----------: |
| RF-01 | Registro de apertura y cierre de la institución |   Alta    |     Módulo de Avisos (3.4)     |    CA-01     |
| RF-02 |           Gestión de aulas y espacios           |   Alta    |     Módulo de Aulas (3.2)      |    CA-03     |
| RF-03 |         Generación de QR de asistencia          |   Alta    | Módulo Actividad Docente (3.3) |    CA-02     |
| RF-04 |          Registro de asistencia por QR          |   Alta    | Módulo Actividad Docente (3.3) |    CA-02     |
| RF-05 |        Publicación de novedades de clase        |   Alta    |   Módulo de Novedades (3.1)    |    CA-03     |
| RF-06 |          Solicitud y selección de aula          |   Media   |     Módulo de Aulas (3.2)      |    CA-04     |
| RF-07 |          Consulta del estado de clases          |   Alta    |   Módulo de Novedades (3.1)    | CA-03, CA-04 |
| RF-08 |     Visualización del estado institucional      |   Alta    |     Módulo de Avisos (3.4)     | CA-01, CA-03 |
| RF-09 |      Consultas históricas para autoridades      |   Media   |  Registro histórico (3.1–3.4)  |    CA-06     |
| RF-10 |         Gestión de usuarios y perfiles          |   Alta    |    Usuarios y Roles (3.1.3)    |    CA-05     |
| RF-11 |            Autenticación de usuarios            |   Alta    |    Usuarios y Roles (3.1.3)    |    CA-05     |
| RF-12 |           Recuperación de contraseña            |   Media   |    Usuarios y Roles (3.1.3)    |    CA-05     |
| RF-13 |        Gestión de datos académicos base         |   Alta    |   Aulas / Usuarios (3.1–3.2)   |    CA-09     |
| RF-14 |      Avisos institucionales y notificación      |   Alta    |     Módulo de Avisos (3.4)     |    CA-03     |
| RF-15 |         Incidencias de infraestructura          |   Media   |     Módulo de Aulas (3.2)      |    CA-06     |
| RF-16 |        Asignación de aulas y aprobación         |   Alta    |     Módulo de Aulas (3.2)      |    CA-04     |
| RF-17 |           Preferencias del estudiante           |   Media   |     Módulo de Avisos (3.4)     |    CA-04     |
| RF-18 |          Registro manual de asistencia          |   Media   | Módulo Actividad Docente (3.3) |    CA-06     |

Apéndice B – Criterios de aceptación (Matriz de Trazabilidad)

|  CA   |                                                                    Criterio                                                                     |
| :---: | :---------------------------------------------------------------------------------------------------------------------------------------------: |
| CA-01 |                     ACEPTADO si el estado institucional queda registrado y visible para todos los perfiles en tiempo real.                      |
| CA-02 |                            ACEPTADO si el QR no puede usarse fuera de la institución ni por perfiles no autorizados.                            |
| CA-03 |            ACEPTADO si los cambios (novedades, disponibilidad de aulas, estado institucional) son visibles en menos de 60 segundos.             |
| CA-04 |                    ACEPTADO si los filtros de búsqueda retornan resultados correctos y actualizados, y funcionan combinados.                    |
| CA-05 | ACEPTADO si cada perfil solo accede a las funcionalidades asignadas a su rol y un usuario no autenticado no accede a funcionalidades privadas.  |
| CA-06 | ACEPTADO si los registros históricos persisten, son consultables con fecha, hora y usuario responsable, y no pueden alterarse retroactivamente. |
| CA-07 |                        ACEPTADO si el sistema funciona correctamente en Chrome, Firefox y Safari, en escritorio y móvil.                        |
| CA-08 |    ACEPTADO si el sistema no expone datos personales sin autorización y provee mecanismos de gestión de privacidad conforme a la Ley 25.326.    |
| CA-09 |                   ACEPTADO si las clases programadas se generan a partir de los horarios cargados sin superposición de aulas.                   |

Apéndice C – Matriz de permisos por perfil

|                  Funcionalidad                   | Estudiante |   Docente    |      Bedel      | Autoridad |
| :----------------------------------------------: | :--------: | :----------: | :-------------: | :-------: |
|    Ver estado institucional y avisos (RF-08)     |     Sí     |      Sí      |       Sí        |    Sí     |
|      Registrar estado institucional (RF-01)      |     No     |      No      |       Sí        |    No     |
|        Consultar estado de clases (RF-07)        |     Sí     | Sí (propias) |       Sí        |    Sí     |
|       Publicar novedades de clase (RF-05)        |     No     | Sí (propias) |       Sí        |    No     |
|             Gestionar aulas (RF-02)              |     No     |      No      |       Sí        |    No     |
|              Solicitar aula (RF-06)              |     No     |      Sí      |       Sí        |    No     |
|   Asignar aulas / aprobar solicitudes (RF-16)    |     No     |      No      |       Sí        |    No     |
|         Generar QR de asistencia (RF-03)         |     No     |      No      |       Sí        |    No     |
|       Registrar asistencia por QR (RF-04)        |     No     |      Sí      |       No        |    No     |
|       Registrar asistencia manual (RF-18)        |     No     |      No      |       Sí        |    No     |
|           Reportar incidencias (RF-15)           |     No     |      Sí      |       Sí        |    No     |
|          Gestionar incidencias (RF-15)           |     No     |      No      |       Sí        |    No     |
|     Publicar avisos institucionales (RF-14)      |     No     |      No      |       Sí        |    Sí     |
|           Consultas históricas (RF-09)           |     No     |      No      | Sí (operativas) |    Sí     |
| Administrar usuarios y datos base (RF-10, RF-13) |     No     |      No      |       Sí        |    Sí     |
|         Configurar preferencias (RF-17)          |     Sí     |      No      |       No        |    No     |

Apéndice D – Modelo de estados de una clase programada

Cada clase programada tiene un estado que ven los estudiantes (RF-07). La tabla resume los estados y los eventos que provocan cada transición.

|      Estado      |                         Significado                         |                         Evento que lo produce                          |                    Estados siguientes                    |
| :--------------: | :---------------------------------------------------------: | :--------------------------------------------------------------------: | :------------------------------------------------------: |
|    Programada    |          Clase prevista, sin registro del docente.          |                     Generación de clases (RF-13).                      | Docente presente, Demorada, Ausente, Virtual, Suspendida |
|     Demorada     |            El docente informó que llegará tarde.            |                       Novedad “Demora” (RF-05).                        |          Docente presente, Ausente, Suspendida           |
| Docente presente |             Asistencia del docente registrada.              |              Asistencia por QR (RF-04) o manual (RF-18).               |                        Finalizada                        |
|     Virtual      |           La clase se dicta en modalidad virtual.           |                 Novedad “Cambio de modalidad” (RF-05).                 |                        Finalizada                        |
|     Ausente      |        El docente no asistirá; la clase no se dicta.        |                      Novedad “Ausencia” (RF-05).                       |                     — (estado final)                     |
|    Suspendida    | Clase suspendida por el docente o por cierre institucional. | Novedad “Suspensión” (RF-05) o estado institucional “Cerrada” (RF-01). |                     — (estado final)                     |
|    Finalizada    |           La franja horaria de la clase terminó.            |                      Fin del horario de la clase.                      |                     — (estado final)                     |

El cambio de aula (RF-05, RF-16) no modifica el estado de la clase: actualiza el aula asignada y genera una novedad visible para los estudiantes.

|                                                                        |
| :--------------------------------------------------------------------: |
| Especificación de Requisitos de SoftwareAdaptado desde IEEE 830 - 1998 |
