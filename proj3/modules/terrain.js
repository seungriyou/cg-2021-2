import {init_shaders} from "./shader.js"
import * as mat4 from "../gl-matrix/mat4.js"
import * as vec4 from "../gl-matrix/vec4.js"

export class Terrain
{
    constructor(gl, d=200)
    {
        this.MVP = mat4.create();
        this.MV = mat4.create();
        this.N = mat4.create();
        this.M = mat4.create();

        if(!Terrain.h_prog)
            Terrain.h_prog = init_shaders(gl, Terrain.src_shader_vert, Terrain.src_shader_frag);
        this.init_texture(gl);
        this.init_vbo(gl, d);
    }
    init_vbo(gl, d)
    {
        // ===== prepare for texCoords & indices =====
        const d_inv = 1/d;  // d = number of division

        // set arrays
        const texCoords = [];
        const indices = [];

        // generate texCoords
        for (let y = 0; y <= d; ++y) {
            for (let x = 0; x <= d; ++x) {
                texCoords.push(x * d_inv, y * d_inv);
            }
        }
        // generate indices
        const rowStride = d + 1;
        for (let y = 0; y < d; ++y) {
            const rowOff = y * rowStride;
            for (let x = 0; x < d; ++x) {
                indices.push(rowOff + x, rowOff + x + 1, rowOff + x + rowStride + 1);
            }
        }
        for (let x = 0; x < d; ++x) {
            for (let y = 0; y < d; ++y) {
                const rowOff = y * rowStride;
                indices.push(rowOff + x, rowOff + x + rowStride + 1, rowOff + x + rowStride);
            }
        }
        this.n = indices.length;

        // ===== bind to vertex array =====
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // texCoord buffer
        const texCoordBuffer = gl.createBuffer();
        if (!texCoordBuffer) {
            console.log('Failed to create the texCoord buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        // index buffer
        const indexBuffer = gl.createBuffer();
        if (!indexBuffer) {
            console.log('Failed to create the index buffer object');
            return -1;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        gl.vertexAttribPointer(Terrain.loc_aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(Terrain.loc_aTexCoord);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    init_texture(gl)
    {
        // create a texture object
        let texture = gl.createTexture();
        if (!texture) {
            console.log('Failed to create the texture object');
            return false;
        }
        // flip the image's y axis 
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // enable texture unit0
        gl.activeTexture(gl.TEXTURE0);
        // bind the texture object to the target
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // set the texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // fill the texture with a 1x1 black pixel
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255]));

        // create the image object
        let image = new Image();
        if (!image) {
            console.log('Failed to create the image object');
            return false;
        }
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        };
        image.src = './yorkville.jpg';
    }
    set_uniform_matrices(gl, h_prog, V, P)
    {
        // MV
        mat4.copy(this.MV, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MV"), false, this.MV);
        // MVP
        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "MVP"), false, this.MVP);
        // matNormal
        mat4.invert(this.N, this.MV);
        mat4.transpose(this.N, this.N);
        gl.uniformMatrix4fv(gl.getUniformLocation(h_prog, "matNormal"), false, this.N);
    }
    set_uniform_lights(gl, h_prog, lights, V)
    {
        let v = vec4.create();
        for (let i = 0; i < Terrain.max_lights; ++i) {
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
    render(gl, V, P, lights, material)
    {
        gl.useProgram(Terrain.h_prog);
        gl.bindVertexArray(this.vao);
        this.set_uniform_matrices(gl, Terrain.h_prog, V, P);
        if (lights)     this.set_uniform_lights(gl, Terrain.h_prog, lights, V);
        if (material)   this.set_uniform_material(gl, Terrain.h_prog, material);
        gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.useProgram(null);
    }
}
Terrain.loc_aTexCoord = 7;
Terrain.max_lights = 10;

// Blinn - Phong
Terrain.src_shader_vert = `#version 300 es
layout(location=${Terrain.loc_aTexCoord}) in vec2 aTexCoord;
uniform mat4 MVP;
uniform mat4 MV;
uniform mat4 matNormal;
uniform sampler2D uSampler;
out vec3 vNormal;
out vec4 vPosEye;

void main() {
    float l = 4.0;  // L_x = L_y = 4
    float s = 1.35;  // scale = 1.35

    // get the height from the heightmap image
    float heightmap_color = texture(uSampler, aTexCoord).r;
    float height = heightmap_color * s - 0.7;
    
    // set the new vertex 
    float x = float(aTexCoord.s * l - l / 2.0);
    float y = float(aTexCoord.t * l - l / 2.0);
    vec3 new_vertex = vec3(x, y, height);

    // compute normal vectors w/ central difference
    const float delta = 0.01;
    const float double_delta = 2.0 * delta;

    float s0 = texture(uSampler, aTexCoord + vec2(-delta, 0.0)).r;
    float s1 = texture(uSampler, aTexCoord + vec2(delta, 0.0)).r;
    float t0 = texture(uSampler, aTexCoord + vec2(0.0, -delta)).r;
    float t1 = texture(uSampler, aTexCoord + vec2(0.0, delta)).r;

    vec3 ds = vec3(l, 0.0, (s1 - s0) / double_delta);
    vec3 dt = vec3(0.0, l, (t1 - t0) / double_delta);
    vec3 new_normal = cross(ds, dt);

    // transform the location of the vertex for the graphics pipeline.
    gl_Position = MVP * vec4(new_vertex, 1.0);

    vPosEye = MV * vec4(new_vertex, 1.0);
    vNormal = normalize(mat3(matNormal) * new_normal);
}`;
Terrain.src_shader_frag =`#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec3 vNormal;
in vec4 vPosEye;
out vec4 fColor;
struct Material
{
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    float   shininess;
};
struct Light
{
    vec4    position;
    vec3    ambient;
    vec3    diffuse;
    vec3    specular;
    bool	enabled;
};
uniform Material material;
uniform Light light[${Terrain.max_lights}];

void main() {
    vec3 n = normalize(vNormal);
    vec3 l;
    vec3 v = normalize(-vPosEye.xyz);
    fColor = vec4(0.0);
    for (int i = 0; i < ${Terrain.max_lights}; ++i)
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
}`;

Terrain.shader = null;
