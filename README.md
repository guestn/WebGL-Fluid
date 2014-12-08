WebGL-Interactive-Fluid
==================================================

This project requires advanced graphics card together with a WebGL capable browser. 

Please also ensure that you have below WebGL extensions, `OES_texture_float`, `OES_texture_float_linear`, `WEBGL_depth_texture`, 
`OES_standard_derivatives`.  
Recommendation is to use latest Firefox / Chrome running on GPU.

[Live Demo](http://dblsai.github.io/WebGL-Fluid)     
[Video Demo](https://www.youtube.com/watch?v=Wq27HIlzpmQ&feature=youtu.be) 

FEATURES
-------------------------------------------------------------------------------
* **Raytraced Reflection & Refraction**  
![Still Water](/pics/Alpha.png)  

* **Mouse Interaction**  
![Mouse](/pics/screenshotmouse.gif)    

* **Sphere Interaction**  
![Sphere](/pics/screenshotsphere.gif)    

* **Caustics**  
![Caustic1](/pics/BetaMouse.png)   

Computing underwater caustics accurately is a complex process: millions of individual photons are involved.  

Here we simplify the computation process by making some assumptions:  
* `Sun is directly above`  
* `floor is lit by rays emanating vertically above the point of interest: caustics will be maximal for vertical rays and will not be as visible for rays entering water sideways`  

for each point we calculate two refract rays, one is using vertical normal and the other is using the real normal. And we get the caustic value by compare the two refract rays, Then write the caustic value to the caustic map.


WATER SIMULATION
-------------------------------------------------------------------------------
To complete water simulation, a gl.RGBA float texture is used to store the simulation data. It is in the format of 
`[height.y, normal.x, normal.z, speed.y]`.  
In the Height Map shader, or the sphere move simulation, `height.y` is updated by mouse click/sphere movement.  
In the Normal Map shader, `normal.x` and `normal.z` is updated with new height information. `normal.y` can be recovered
when used.  
In the step simulation, `speed.y` is calculated based on new height and normal information. the speed is also attenuated 
to eventually stop the wave pattern.    
Ad the end, the texture `[height.y, normal.x, normal.z, speed.y]` is passed into water mesh shaders as useful information to render 
out the water simualtion.  

* **Height Map**   
![HeightMap](/pics/HeightMap.png)  
As you can see, the height of vertex is changed after this shader.    
`height.y += drag` (drag is based on dist to click center)     

* **Normal Map**    
![NormalMap](/pics/NormalMap.png)  
The normal is calculated and shaded correctly after this shader.   
`normal = cross (dHeight/dx, dHeight/dy)`    

* **Step Simulation**    
![StepSimulation](/pics/Simulation.png)  
The wave propagates and attenuates due to this shader.      
`speed.y += (averageHeight - Height)`  
`averageHeight = (sum of 4 neighbouring Heights)/4`  


* **Sphere Move Simulation**  
![SphereMovement](/pics/BetaCaustics.png) 
This shader calculates wave pattern based on sphere movement.  
`height.y += volume in water (oldCenter)`   
`height -= volume in water(newCenter)`  

OBJ INTERACTION & SHADING
-------------------------------------------------------------------------------
* **Obj Shading**   
Load the obj by Threejs obj loader, then shade it by diffuse BRDF.  


* **Obj Shadow**    
This is done by a Shadow Map(depth texture) that is rendered a from the point of view of light. 
Then in the shader, transform vertex into the light view space, determine shadow by the following rule
`if(position.z > depth) ---> part of shadow`  
![ObjShadow](/pics/objShadow.png) 

* **Obj Reflection & Refraction**  
This can be turn on under GUI `debug image` under `draw_obj_reflect`. The idea is similar to shadow map, 
to render a reflection texture from the point of view of reflection point, and use this texture for shading the water.  
Now the reflection and refraction positions are not right, to be fixed in the future.  
![ObjReflection](/pics/objReflection.png) 

PERFORMANCE EVALUATION
-------------------------------------------------------------------------------

![Analysis](/pics/Analysis.png)

As you can see, as more simulation shader added into the pipeline, the performance evetually drops. 
But all the fps is above 60, which means our WebGL Water is truly fast and real-time.  

INTERACTION
-------------------------------------------------------------------------------
* Right Mouse Button - rotate  
* Left Mouse Button - interact  
* Middle Mouse Wheel - zoom  
* GUI - change skybox, change object, add wind/rain effect


REFERRENCES
-------------------------------------------------------------------------------
* WebGL Water by Evan Wallace : [Evan Wallace](http://madebyevan.com/webgl-water/) 
* Water Caustic: [GPU Gem](http://http.developer.nvidia.com/GPUGems/gpugems_ch02.html)
* WebGL Rendering to Texture: [Learing WebGL](http://learningwebgl.com/blog/?p=1786)
* Shadow Map: http://www.nutty.ca/webgl/shadows/  

