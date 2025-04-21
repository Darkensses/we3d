import std.core;
import std.io;
import std.mem;

struct Vertex {
    u16 x [[color("1919FF")]];
    u16 y [[color("3333ff")]];
    u16 z [[color("6666ff")]];
    u16 PAD [[color("000000")]];
};    

struct Header {
    u32 id;
    u32 flags;
    u32 nObj;
};

struct Object {
    u32 vert_top;
    u32 n_vert;
    u32 normal_top;
    u32 n_normal;
    u32 primitive_top;
    u32 n_primitive;
    s32 scale;
};

struct Primitive {
    u8 olen;
    u8 ilen;
    u8 flag;
    u8 mode;
};

/**
Packet Configuration for 4 Vertex Polygon with No Light Source Calculation
*/
namespace FVPNL {
    struct FourVertex {
        u16  vertex0; u16   vertex1;
        u16  vertex2; u16   vertex3;
    }[[color("ff00c8")]];
    
    struct _Gradation_Texture {
        Primitive header;
        u8 U0; u8 V0;       u16 CBA;
        u8 U1; u8 V1;       u16 TSB;
        u8 U2; u8 V2;        $ += 2;
        u8 U3; u8 V3;        $ += 2;
        u8 R0; u8 G0; u8 B0; $ += 1;
        u8 R1; u8 G1; u8 B1; $ += 1;
        u8 R2; u8 G2; u8 B2; $ += 1;
        u8 R3; u8 G3; u8 B3; $ += 1;
        FourVertex vertex;
        //u16  vertex0; u16   vertex1;
        //u16  vertex2; u16   vertex3;        
    };
    
    struct Gradation_Texture {
        _Gradation_Texture packetData[
            parent.object[ std::core::array_index() ].n_primitive
        ][[color("FFFF00")]];
        Vertex vertex[
            parent.object[ std::core::array_index() ].n_vert
        ];
    };
    
    struct _Flat_Texture {
        Primitive header;
        u8 U0; u8 V0;       u16 CBA;
        u8 U1; u8 V1;       u16 TSB;
        u8 U2; u8 V2;        $ += 2;
        u8 U3; u8 V3;        $ += 2;
        u8 R; u8 G; u8 B;    $ += 1;
        FourVertex vertexIdx;           
    };
    
    struct Flat_Texture {
        _Flat_Texture packetData[
            parent.object[ std::core::array_index() ].n_primitive
        ][[color("000000")]];
        Vertex vertex[
            parent.object[ std::core::array_index() ].n_vert
        ];
    };
}

struct TMD {
    match(std::mem::read_unsigned($, 4)) {
        (0x00000041): {
            Header header;
            Object object[header.nObj];            
            
            if(std::mem::read_unsigned($, 4) == 0x3d010a0c) {
                 FVPNL::Gradation_Texture packetData[header.nObj];
            } else 
            if (std::mem::read_unsigned($, 4) == 0x2d010709) {
                 FVPNL::Flat_Texture packetData[header.nObj];            
            }           
        }
        (_): {            
            $ += 1;
            continue;
        }
    }
};

TMD models[while(!std::mem::eof())] @ 0x0;