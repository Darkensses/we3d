# Formato MODEL.BIN — Notas de Ingeniería Inversa

> Estas notas documentan lo que se aprendió analizando `MODEL.BIN` del ROM
> de **Winning Eleven** (PSX) mediante inspección hexadecimal,
> comparación con la especificación oficial TMD del PSX
> (`Filefrmt_tmd.pdf`) y derivación matemática. No se requirió emulador.

---

## Contexto

`MODEL.BIN` es un archivo binario del ROM de Winning Eleven que contiene
toda la geometría 3D de los modelos de jugadores. **No usa el formato TMD
estándar** (que sí usan `CGAF.BIN` y `GRDM_A.BIN`). En cambio, utiliza un
formato binario personalizado y simplificado, diseñado para cargarse
directamente en la RAM del PSX y ser referenciado mediante una tabla de
punteros.

---

## Estructura del Archivo

```
[ 0x000 – 0x717 ]  Tabla de Punteros   (1816 bytes)
[ 0x718 – EOF   ]  Datos de Geometría  (106 secciones, contiguas)
```

La tabla de punteros y las secciones de geometría forman parte del mismo
archivo. Hay cinco separadores de 8 bytes en cero (relleno nulo) en los
offsets `0xa5b0`, `0xa8d8`, `0xe818`, `0xf018` y `0xf638` dentro del área
de geometría — dividen las secciones en grupos, pero no tienen ningún
significado estructural para el renderizado.

---

## La Dirección Base del PSX (BASE)

### ¿Qué es BASE?

Cuando el PSX carga `MODEL.BIN` desde el disco a la RAM, el byte `0` del
archivo queda en una dirección de memoria específica. En PSX, todas las
direcciones de RAM empiezan con `0x80`. Esa dirección de inicio se llama
**BASE**.

La tabla de punteros almacena direcciones de RAM — no offsets del archivo.
Para convertir un puntero de vuelta a una posición dentro del archivo:

```
offset_en_archivo = direccion_psx - BASE
```

### Cómo se derivó BASE (sin emulador)

La tabla de punteros contiene ~124 direcciones de RAM. Las secciones de
geometría también fueron parseadas de forma independiente, obteniendo sus
offsets en el archivo. Luego se hizo una búsqueda exhaustiva: por cada par
`(dirección de la tabla, offset de sección)`, se calculó un candidato a
BASE como `dirección - offset`. El valor `0x8016E800` produjo **55
coincidencias sobre 55 secciones** — cada sección mapeó a una dirección que
realmente existe en la tabla. Eso es matemáticamente concluyente.

```
BASE = 0x8016E800

Verificación:
  Sección 0  →  offset 0x0718  →  dirección PSX 0x8016EF18  ✓ (en tabla en offset 0x04C)
  Sección 1  →  offset 0x12B8  →  dirección PSX 0x8016FAB8  ✓ (en tabla en offset 0x05C)
```

---

## Secciones de Geometría

### ¿Qué es una sección?

Una **sección** es una malla 3D independiente — una parte del cuerpo de un
jugador (cabeza, torso, brazo, pierna, etc.). El archivo contiene **106
secciones** almacenadas consecutivamente a partir del offset `0x718`.

### Formato binario de una sección

```
Offset  Tamaño  Campo
------  ------  -------------------------------------------------
0       4       numVertex    (uint32, little-endian)
4       4       numPrimitive (uint32, little-endian)
8       24 × numPrimitive   Bloque de primitivos (ver abajo)
8 + numPrimitive×24         Bloque de vértices (ver abajo)
```

### Bloque de primitivos (24 bytes cada uno)

Cada primitivo es una cara cuadrilateral (4 vértices). Corresponde al
paquete **Gradación Sin Textura Sin Luz de 4 Vértices** de la especificación
TMD (`mode = 0x39`, `flag = 0x01`) — pero con el encabezado de 4 bytes
`olen/ilen/flag/mode` removido. Todos los primitivos en MODEL.BIN son del
mismo tipo, por lo que el encabezado es implícito.

```
Offset  Tamaño  Campo
------  ------  ----------------------------------------
0       4       Color vértice 0  (B, G, R, relleno)
4       4       Color vértice 1  (B, G, R, relleno)
8       4       Color vértice 2  (B, G, R, relleno)
12      4       Color vértice 3  (B, G, R, relleno)
16      2       Índice vértice 1  (uint16)
18      2       Índice vértice 0  (uint16)
20      2       Índice vértice 3  (uint16)
22      2       Índice vértice 2  (uint16)
```

> El orden de los índices sigue la convención TMD: `v1, v0, v3, v2`.
> Para construir triángulos al renderizar, dividir el cuad así:
> `(v0, v1, v2)` y `(v1, v3, v2)`.

### Bloque de vértices (8 bytes cada uno)

```
Offset  Tamaño  Campo
------  ------  ----------------------
0       2       x  (int16, con signo)
2       2       y  (int16, con signo)
4       2       z  (int16, con signo)
6       2       relleno (siempre 0x0000)
```

Las coordenadas son enteros fijos del PSX. Para renderizarlas a una escala
visible en Three.js, multiplicar por `0.001` y rotar `−π` en el eje X.

### Secciones conocidas (primeras)

| Índice | Offset archivo | numVertex | numPrimitive | Notas                   |
|--------|----------------|-----------|--------------|-------------------------|
| 0      | `0x0718`       | 107       | 88           | Pelota / cabeza var. A  |
| 1      | `0x12B8`       | 50        | 48           | Pelota / cabeza var. B  |
| 2      | `0x18D0`       | 33        | 22           | Cuerpo tipo A           |
| 3      | `0x1BF0`       | 8         | 5            | Parte pequeña           |
| 11     | (varía)        | —         | —            | Parte compartida        |
| 12     | (varía)        | —         | —            | Parte compartida        |

Las secciones **11** y **12** aparecen en 11 de los 14 modelos de jugador —
son partes compartidas globalmente, probablemente botines o pantaloncitos.

---

## Estructura de la Tabla de Punteros

La tabla de punteros (bytes `0x000`–`0x717`) está organizada así:

```
[ 0x000 – 0x04F ]  18 direcciones RAM → punteros hacia la propia tabla
[ 0x050 – 0x05F ]  Entradas independientes: secciones 0 y 1 (pelotas)
[ 0x060 – 0x167 ]  Lista larga de direcciones RAM de secciones (variantes)
[ 0x168 – 0x717 ]  14 definiciones de modelos de jugador
```

### Bloque de definición de jugador

Cada definición de jugador empieza con `0x00000080` y termina con
`0x000000FF` seguido de `0x00000000`:

```
[0x80]                  marcador
[dirección RAM]         apunta a lista de variantes en 0x060–0x167
[0x02][addr sección] × 11   once slots: contador(2) + puntero de sección
[0xFF][0x00]            terminador
```

### Las 14 definiciones de modelos de jugador

Cada jugador se construye con exactamente **11 slots de sección**.
`?` significa que ese slot es nulo (sin geometría para esa variante).

```
Jugador  0: [65, 66, 67, 68, 69, 70, 72, 11, 71, 73, 12]
Jugador  1: [65,103,104,103,105, 70, 72, 11, 71, 73, 12]
Jugador  2: [13, 14, 16, 15, 17, 18, 20, 11, 19, 21, 12]
Jugador  3: [13, 14, 16, 15, 17, 18, 22,  ?, 19, 23,  ?]
Jugador  4: [ 2,  3,  5,  4,  6,  7,  9, 11,  8, 10, 12]
Jugador  5: [56, 57, 58, 59, 60, 61, 63,  ?, 62, 64,  ?]
Jugador  6: [13, 14, 16, 92, 17, 18, 20, 11, 19, 21, 12]
Jugador  7: [13, 14, 16, 92, 17, 18, 22,  ?, 19, 23,  ?]
Jugador  8: [ 2,  3,  5, 90,  6,  7,  9, 11,  8, 10, 12]
Jugador  9: [56, 57, 58, 91, 60, 61, 63,  ?, 62, 64,  ?]
Jugador 10: [ 2, 95, 96, 97, 98,  7,  9, 11,  8, 10, 12]
Jugador 11: [56, 99,101,100,102, 61, 63,  ?, 62, 64,  ?]
Jugador 12: [ 2, 95, 96, 93, 98,  7,  9, 11,  8, 10, 12]
Jugador 13: [56, 99,101, 94,102, 61, 63,  ?, 62, 64,  ?]
```

### Los 11 slots de partes del cuerpo

El mapeo exacto slot → parte del cuerpo aún no está confirmado (requeriría
correr el juego y observar el orden de dibujado), pero el patrón en los
datos sugiere:

| Slot | Parte probable         | Evidencia                                      |
|------|------------------------|------------------------------------------------|
| 0    | Forma de cabeza        | Varía entre grupos de jugadores                |
| 1    | Malla de pelo          | Se intercambia entre jugadores similares       |
| 2    | Cara                   | Se intercambia entre jugadores similares       |
| 3    | Torso / camiseta       | Se intercambia para cambiar piel o kit         |
| 4    | Brazo izquierdo        | —                                              |
| 5    | Brazo derecho          | —                                              |
| 6    | Pierna izquierda       | —                                              |
| 7    | Compartido (secc. 11)  | Presente en 11/14 jugadores                    |
| 8    | Pierna derecha         | —                                              |
| 9    | Pie / botín            | —                                              |
| 10   | Compartido (secc. 12)  | Presente en 11/14 jugadores                    |

### Sistema de variantes

Los jugadores reutilizan la mayoría de las secciones y solo intercambian
slots específicos. Por ejemplo, los jugadores 4 y 8 son idénticos salvo el
slot 3 (sección `4` → `90`), que probablemente es una camiseta o tono de
piel diferente. Así es como el juego representa un equipo completo de forma
eficiente — se define la geometría base una vez y solo se varía lo que
cambia.

---

## Conexión con la Especificación TMD

El `Filefrmt_tmd.pdf` en este repositorio es la documentación oficial de
Sony para el formato TMD del PSX. No describe MODEL.BIN directamente, pero
define los tipos de paquetes de primitivos. MODEL.BIN usa el paquete de
**4 Vértices Gradación Sin Textura Sin Luz** (`mode 0x39`) — sin el
encabezado de 4 bytes — como su tipo universal de primitivo. Todas las
caras de todas las secciones son el mismo tipo de paquete, razón por la
que MODEL.BIN puede usar un stride fijo de 24 bytes en vez de los paquetes
de longitud variable que usa el TMD estándar.

---

## Referencias

- `Filefrmt_tmd.pdf` — Referencia oficial de Sony para formatos de archivo PSX (sección TMD)
- `src/lib/TMDParser.v2.js` — Parser para archivos TMD estándar (CGAF.BIN, GRDM_A.BIN)
- `src/model.bin.js` — PoC original con offsets hardcodeados (reemplazado por este análisis)
- https://github.com/rickomax/psxprev — PSXPrev, parser TMD de referencia en C#
