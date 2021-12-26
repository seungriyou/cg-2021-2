import {init_shaders} from "./shader.js"
import * as mat4 from "../gl-matrix/mat4.js"
import * as vec4 from "../gl-matrix/vec4.js"
import * as vec3 from "../gl-matrix/vec3.js"

export class Light
{
    constructor(gl, position, ambient, diffuse, specular, enabled)
    {
		this.position = vec4.clone(position);
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
        this.enabled = enabled;

        this.M = mat4.create();
		this.MVP = mat4.create();

        this.velocity_z = -0.00025;

        this.new_position = vec4.create();

		if(!Light.h_prog)
			Light.h_prog = init_shaders(gl, Light.src_shader_vert, Light.src_shader_frag);
	}
    turn_on(enabled)
    {
        this.enabled = enabled;
    }
    set_M(M)
    {
        // copy from the current chopper's M
        mat4.copy(this.M, M);
    }
    set_velocity_x(v_x)
    {
        this.velocity_x = v_x;
    }
    render(gl, V, P)
	{
		gl.useProgram(Light.h_prog);

        mat4.copy(this.MVP, P);
        mat4.multiply(this.MVP, this.MVP, V);
		gl.uniformMatrix4fv(gl.getUniformLocation(Light.h_prog, "MVP"), false, this.MVP);

        vec4.transformMat4(this.new_position, this.position, this.M);
		gl.vertexAttrib4fv(Light.loc_aPosition, this.new_position);

        // if z < 0, turn the light off
        if (this.new_position[2] < 0)    this.turn_on(false);

        // draw only turned-on lights
		if (this.enabled) {
            gl.vertexAttrib3f(Light.loc_aColor, 1, 1, 1);
            gl.drawArrays(gl.POINTS, 0, 1);
        } 
		gl.useProgram(null);
	}
}
Light.loc_aPosition = 3;
Light.loc_aColor = 8;

Light.src_shader_vert = `#version 300 es
layout(location=${Light.loc_aPosition}) in vec4 aPosition;
layout(location=${Light.loc_aColor}) in vec4 aColor;
uniform mat4 MVP;
out vec4 vColor;
void main()
{
    gl_Position = MVP * vec4(aPosition.xyz, 1);
    gl_PointSize = 6.0;
    vColor = aColor;
}
`;
Light.src_shader_frag = `#version 300 es
#ifdef GL_ES
precision mediump float;
#endif
in vec4 vColor;
out vec4 fColor;
void main()
{
    fColor = vColor;
}
`;

Light.shader = null;
