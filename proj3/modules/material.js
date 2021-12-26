import * as vec3 from "../gl-matrix/vec3.js"

export class Material
{
    constructor(ambient, diffuse, specular, shininess)
	{
		this.ambient = vec3.clone(ambient);
		this.diffuse = vec3.clone(diffuse);
		this.specular = vec3.clone(specular);
		this.shininess = shininess;
	}
}
