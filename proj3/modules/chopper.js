import {init_shaders} from "./shader.js"
import * as mat4 from "../gl-matrix/mat4.js"
import * as vec4 from "../gl-matrix/vec4.js"

export class Chopper
{
    constructor(gl)
    {
        this.MVP = mat4.create();
        this.MV = mat4.create();
        this.N = mat4.create();
        this.M = mat4.create();
        this.M_rotor = mat4.create();

        if(!Chopper.h_prog)
        Chopper.h_prog = init_shaders(gl, Chopper.src_shader_vert, Chopper.src_shader_frag);
        this.init_vbo(gl);
    }
    init_vbo(gl)
    {
        // ===== body =====
        // ----- prepare for texCoords & indices -----
        const vertices = new Float32Array([
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  -0.125, -0.125, -0.125,  -0.125, 0.125, -0.125,// ABCD
            -0.125, -0.125, 0.125,  -0.125, 0.125, 0.125,  0.125, -0.125, 0.125,  0.125, 0.125, 0.125,// ABEF
            -0.125, -0.125, 0.125,  -0.125, -0.125, -0.125,  0.125, -0.125, 0.125,  0.125, -0.125, -0.125,// ACEG
            -0.125, 0.125, 0.125,  -0.125, 0.125, -0.125,  0.125, 0.125, 0.125,  0.125, 0.125, -0.125,// BDFH
            0.125, -0.125, 0.125,  0.125, 0.125, 0.125,  0.125, -0.125, -0.125,  0.125, 0.125, -0.125,// EFGH
            -0.125, -0.125, -0.125,  -0.125, 0.125, -0.125,  0.125, -0.125, -0.125,  0.125, 0.125, -0.125, // CDGH
            0.125, -0.07, 0.07,  0.125, 0.07, 0.07,  0.375, -0.07, 0.07,  0.375, 0.07, 0.07,// IJMN
            0.125, -0.07, 0.07,  0.125, -0.07, -0.07,  0.375, -0.07, 0.07,  0.375, -0.07, -0.07,// IKMO
            0.125, 0.07, 0.07,  0.125, 0.07, -0.07,  0.375, 0.07, 0.07,  0.375, 0.07, -0.07, // JLNP
            0.375, -0.07, 0.07,  0.375, 0.07, 0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// MNOP
            0.125, -0.07, -0.07,  0.125, 0.07, -0.07,  0.375, -0.07, -0.07,  0.375, 0.07, -0.07,// KLOP
        ]);
        const normals = new Float32Array([
            -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,// ABCD
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,// ABEF
            0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,// ACEG
            0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,// BDFH
            1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// EFGH
            0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,// CDGH
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,// IJMN
            0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,// IKMO
            0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,// JLNP
            1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,// MNOP
            0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,// KLOP
        ]);
        const indices = new Uint16Array([
            0, 1, 2,  1, 3, 2,// ABCD
            5, 6, 7,  4, 6, 5,// ABEF
            8, 9, 10,  9, 11, 10,// ACEG
            13, 14, 15,  12, 14, 13,// BDFH
            17, 18, 19,  16, 18, 17,// EFGH
            20, 21, 22,  21, 23, 22,// CDGH
            25, 26, 27,  24, 26, 25,// IJMN
            28, 29, 30,  29, 31, 30,// IKMO
            33, 34, 35,  32, 34, 33,// JLNP
            37, 38, 39,  36, 38, 37,// MNOP
            40, 41, 42,  41, 43, 42,// KLOP
        ]);
        this.n = indices.length;
        
        // ----- bind to vertex array -----
        this.body_vao = gl.createVertexArray();
        gl.bindVertexArray(this.body_vao);

        const verticesBuffer = gl.createBuffer();
        if (!verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aPosition);

        const normalBuffer = gl.createBuffer();
        if (!normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aNormal);        

        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


        // ===== rotor =====
        // ----- prepare for texCoords & indices -----
        const rotor_vertices = new Float32Array([
            0.0, 0.0, 0.13,  -0.5, 0.08, 0.13,  -0.5, -0.08, 0.13,//ABC
            0.0, 0.0, 0.13,  -0.08, -0.5, 0.13,  0.08, -0.5, 0.13,//ADE
            0.0, 0.0, 0.13,  0.5, -0.08, 0.13,  0.5, 0.08, 0.13,//AFG
            0.0, 0.0, 0.13,  0.08, 0.5, 0.13,  -0.08, 0.5, 0.13,//AHI
        ]);
        const rotor_normals = new Float32Array([
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ABC
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//ADE
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AFG
            0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,//AHI
        ]);

        // ----- bind to vertex array -----
        this.rotor_vao = gl.createVertexArray();
        gl.bindVertexArray(this.rotor_vao);

        const rotor_verticesBuffer = gl.createBuffer();
        if (!rotor_verticesBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aPosition);

        const rotor_normalBuffer = gl.createBuffer();
        if (!rotor_normalBuffer) {
            console.log('Failed to create the buffer object');
            return false;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, rotor_normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, rotor_normals, gl.STATIC_DRAW);
        gl.vertexAttribPointer(Chopper.loc_aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Chopper.loc_aNormal);   
        
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    set_uniform_matrices_body(gl, h_prog, M, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        mat4.multiply(this.MV, this.MV, this.M); 
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.copy(this.MVP, V);
        mat4.multiply(this.MVP, this.MVP, this.M);
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_matrices_rotor(gl, h_prog, M, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        mat4.copy(this.M, M);
        mat4.multiply(this.MV, this.MV, this.M);
        mat4.multiply(this.MV, this.MV, this.M_rotor);  // rotor's rotation
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, this.MV);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.copy(this.MVP, V); 
        mat4.multiply(this.MVP, this.MVP, this.M);
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for (let i = 0; i < Chopper.max_lights; ++i) {
            let light = lights[i];
            mat4.copy(this.MV, V);
            mat4.multiply(this.MV, this.MV, light.M);
            vec4.transformMat4(v, light.position, this.MV);

            gl.uniform4fv(gl.getUniformLocation(h_prog, `light[${i}].position`), v);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].ambient`), light.ambient);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].diffuse`), light.diffuse);
            gl.uniform3fv(gl.getUniformLocation(h_prog, `light[${i}].specular`), light.specular);
            gl.uniform1i(gl.getUniformLocation(h_prog, `light[${i}].enabled`), light.enabled);
        }
    }
    set_uniform_material(gl, h_prog, mat)
    {
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.ambient"), mat.ambient);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.diffuse"), mat.diffuse);
        gl.uniform3fv(gl.getUniformLocation(h_prog, "material.specular"), mat.specular);
        gl.uniform1f(gl.getUniformLocation(h_prog, "material.shininess"), mat.shininess * 128.0);
    }
    render(gl, M, V, P, lights, material)
    {
        gl.useProgram(Chopper.h_prog);

        // ===== rotor =====
        gl.bindVertexArray(this.rotor_vao);
        this.set_uniform_matrices_rotor(gl, Chopper.h_prog, M, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawArrays(gl.TRIANGLES, 0, 12);
        gl.bindVertexArray(null);

        // ===== body =====
        gl.bindVertexArray(this.body_vao);
        this.set_uniform_matrices_body(gl, Chopper.h_prog, M, V, P);
        if (lights)     this.set_uniform_lights(gl, Chopper.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Chopper.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);

        gl.useProgram(null);
    }
}
Chopper.loc_aPosition = 0;
Chopper.loc_aNormal = 4;
Chopper.max_lights = 10;

// Blinn - Phong
Chopper.src_shader_vert = `#version 300 es
layout(location=${Chopper.loc_aPosition}) in vec4 aPosition;
layout(location=${Chopper.loc_aNormal}) in vec3 aNormal;
uniform mat4	MVP;
uniform mat4	MV;
uniform mat4	matNormal;
out vec3	vNormal;
out vec4	vPosEye;
void main()
{
    vPosEye = MV*aPosition;
    vNormal = normalize(mat3(matNormal)*aNormal);
    gl_Position = MVP*aPosition;
}
`;
Chopper.src_shader_frag = `#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec4	vPosEye;
in vec3	vNormal;
out vec4 fColor;
struct Material
{
    vec3	ambient;
    vec3	diffuse;
    vec3	specular;
    float	shininess;
};
struct Light
{
    vec4	position;
    vec3	ambient;
    vec3	diffuse;
    vec3	specular;
    bool	enabled;
};
uniform Material	material;
uniform Light		light[${Chopper.max_lights}];
void main()
{
    vec3	n = normalize(vNormal);
    vec3	l;
    vec3	v = normalize(-vPosEye.xyz);
    fColor = vec4(0.0);
    for (int i=0 ; i<${Chopper.max_lights} ; i++)
    {
        if(light[i].enabled)
        {   
            l = normalize((light[i].position - vPosEye).xyz);
            float	l_dot_n = max(dot(l, n), 0.0);
            vec3	ambient = light[i].ambient * material.ambient;
            vec3	diffuse = light[i].diffuse * material.diffuse * l_dot_n;
            vec3	specular = vec3(0.0);
            if(l_dot_n > 0.0)
            {
                vec3	h = normalize(l + v);
                specular = light[i].specular * material.specular * pow(max(dot(h, n), 0.0), material.shininess);
            }
            fColor += vec4(ambient + diffuse + specular, 1);
        }
    }
    fColor.w = 1.0;
}
`;

Chopper.shader = null;
