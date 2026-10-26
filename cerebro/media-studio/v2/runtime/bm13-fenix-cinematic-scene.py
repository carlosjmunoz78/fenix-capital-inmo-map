import bpy
import math
import os
import sys
from mathutils import Vector


def args_after_double_dash():
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1:]


args = args_after_double_dash()
out_dir = os.path.abspath(args[0] if args else "/tmp/cerebro-ums-bm13/blender")
os.makedirs(out_dir, exist_ok=True)

# Clean scene.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.curves, bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    pass

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 540
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 96
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.filepath = os.path.join(out_dir, "frame_")
scene.render.use_file_extension = True
scene.world.color = (0.004, 0.005, 0.008)

# Color management / cinematic highlight rolloff.
scene.view_settings.look = "AgX - Medium High Contrast"


def make_emission(name, color, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*color, 1.0)
    emission.inputs["Strength"].default_value = strength
    links.new(emission.outputs["Emission"], out.inputs["Surface"])
    return mat


def make_principled(name, base, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


ORANGE = (1.0, 0.116, 0.0)      # #FF5F00
GOLD = (1.0, 0.474, 0.011)      # #FFB71B normalized-ish
MAGENTA = (0.242, 0.0, 0.154)   # #870064 adapted to linear display
CHARCOAL = (0.016, 0.016, 0.016)
WHITE = (1.0, 0.92, 0.8)

mat_orange = make_emission("Fenix Orange Glow", ORANGE, 8.0)
mat_gold = make_emission("Fenix Gold Glow", GOLD, 5.0)
mat_magenta = make_emission("Fenix Magenta Glow", MAGENTA, 3.0)
mat_dark = make_principled("Charcoal Metal", (0.025, 0.028, 0.035), metallic=0.65, roughness=0.22)
mat_glass = make_principled("Warm Ivory", (0.34, 0.20, 0.08), metallic=0.15, roughness=0.28)


def add_curve(name, points, mat, bevel=0.028, cyclic=False):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = bevel
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for i, p in enumerate(points):
        spline.points[i].co = (*p, 1.0)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# Ground plane.
bpy.ops.mesh.primitive_plane_add(size=28, location=(0, 0, -1.65))
ground = bpy.context.object
ground.name = "Reflective Ground"
ground.data.materials.append(mat_dark)

# Hero house silhouette: readable, original, brand-native geometry.
house_outline = [
    (-2.45, 0.0, -1.05), (-2.45, 0.0, 1.15), (0.0, 0.0, 3.25),
    (2.45, 0.0, 1.15), (2.45, 0.0, -1.05), (-2.45, 0.0, -1.05)
]
add_curve("Fenix House Outline", house_outline, mat_orange, 0.055)
add_curve("Fenix Roof Accent", [(-2.9, 0.03, 1.15), (0.0, 0.03, 3.65), (2.9, 0.03, 1.15)], mat_gold, 0.035)

# Interior doorway / path.
add_curve("Doorway", [(-0.55, -0.03, -1.05), (-0.55, -0.03, 0.55), (0.55, -0.03, 0.55), (0.55, -0.03, -1.05)], mat_gold, 0.04)

# Energy core, deliberately not an atom icon: one dense core + partial arcs.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=0.30, location=(0, -0.08, 0.95))
core = bpy.context.object
core.name = "Mortgage Decision Core"
core.data.materials.append(mat_orange)
core.scale = (1.0, 1.0, 1.0)
core.keyframe_insert(data_path="scale", frame=1)
core.scale = (1.22, 1.22, 1.22)
core.keyframe_insert(data_path="scale", frame=48)
core.scale = (1.0, 1.0, 1.0)
core.keyframe_insert(data_path="scale", frame=96)

# Irregular partial arcs around core.
for idx, (radius, z, mat, start, span) in enumerate([
    (0.78, 0.95, mat_gold, 0.35, 2.65),
    (1.05, 0.82, mat_orange, 2.2, 2.1),
    (1.32, 1.08, mat_magenta, 4.15, 1.55),
]):
    pts = []
    for step in range(26):
        a = start + span * step / 25.0
        pts.append((radius * math.cos(a), -0.18 + 0.12 * math.sin(a * 1.7), z + 0.20 * math.sin(a)))
    arc = add_curve(f"Energy Arc {idx+1}", pts, mat, 0.018)
    arc.rotation_euler[2] = -0.25 + idx * 0.2
    arc.keyframe_insert(data_path="rotation_euler", frame=1)
    arc.rotation_euler[2] += 0.55 * (1 if idx % 2 == 0 else -1)
    arc.keyframe_insert(data_path="rotation_euler", frame=96)

# Floating document panels / decision data: real geometry with independent motion.
for i in range(9):
    angle = (i / 9.0) * math.tau + 0.35
    radius = 3.4 + 0.35 * math.sin(i * 1.2)
    x = math.cos(angle) * radius
    y = 0.55 + (i % 3) * 0.34
    z = 0.65 + math.sin(angle * 1.7) * 1.9
    bpy.ops.mesh.primitive_cube_add(location=(x, y, z), scale=(0.58, 0.025, 0.78))
    panel = bpy.context.object
    panel.name = f"Finance Panel {i+1}"
    panel.data.materials.append(mat_glass if i % 2 else mat_dark)
    panel.rotation_euler = (0.06 * math.sin(i), 0.12 * math.cos(i), -angle * 0.35)
    panel.keyframe_insert(data_path="location", frame=1)
    panel.keyframe_insert(data_path="rotation_euler", frame=1)
    panel.location.z += 0.28 * (1 if i % 2 == 0 else -1)
    panel.rotation_euler[2] += 0.18 * (1 if i % 3 else -1)
    panel.keyframe_insert(data_path="location", frame=96)
    panel.keyframe_insert(data_path="rotation_euler", frame=96)
    # Two glowing information strokes on each panel.
    for j in range(2):
        yline = -0.035
        zline = z + 0.22 - j * 0.37
        width = 0.65 if j == 0 else 0.42
        p1 = (x - width * math.cos(angle), y + yline, zline - width * 0.05)
        p2 = (x + width * math.cos(angle), y + yline, zline + width * 0.05)
        add_curve(f"Panel Stroke {i+1}-{j+1}", [p1, p2], mat_gold if j == 0 else mat_orange, 0.012)

# Sparse floor traces for depth, not a generic sci-fi grid.
for i in range(-5, 6):
    offset = i * 0.72
    add_curve(f"Floor Trace {i}", [(offset, 4.5, -1.60), (offset * 0.62, -2.5, -1.60)], mat_magenta if i % 3 == 0 else mat_gold, 0.008)

# Lights.
def area_light(name, location, energy, color, size=5.0):
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    bpy.context.collection.objects.link(obj)
    return obj

area_light("Warm Key", (4.5, -4.0, 5.0), 900, (1.0, 0.23, 0.03), 5.0)
area_light("Soft Rim", (-4.0, -1.0, 3.0), 650, (0.56, 0.06, 0.32), 4.0)
area_light("Top Warm", (0.0, 2.5, 7.0), 500, (1.0, 0.58, 0.16), 3.0)

# Camera and tracked target.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0.0, 0.75))
target = bpy.context.object
target.name = "Camera Target"

cam_data = bpy.data.cameras.new("Hero Camera")
cam = bpy.data.objects.new("Hero Camera", cam_data)
bpy.context.collection.objects.link(cam)
scene.camera = cam
cam_data.lens = 52
cam_data.dof.use_dof = True
cam_data.dof.focus_object = target
cam_data.dof.aperture_fstop = 2.8

constraint = cam.constraints.new(type="TRACK_TO")
constraint.target = target
constraint.track_axis = "TRACK_NEGATIVE_Z"
constraint.up_axis = "UP_Y"

cam.location = (0.75, -10.6, 1.35)
cam.keyframe_insert(data_path="location", frame=1)
cam.location = (-0.45, -8.0, 1.62)
cam.keyframe_insert(data_path="location", frame=50)
cam.location = (0.25, -6.85, 1.18)
cam.keyframe_insert(data_path="location", frame=96)

cam_data.lens = 58
cam_data.keyframe_insert(data_path="lens", frame=1)
cam_data.lens = 48
cam_data.keyframe_insert(data_path="lens", frame=96)

# Slight target drift adds parallax and avoids a sterile orbital feel.
target.location = (0.0, 0.0, 0.72)
target.keyframe_insert(data_path="location", frame=1)
target.location = (0.12, 0.0, 0.95)
target.keyframe_insert(data_path="location", frame=96)

# Blender 5.2 compositor APIs are intentionally not used here; physical finishing/glow
# is applied later by the FFmpeg finishing stage so this scene remains stable and rebuildable.

# Blender 5.2 changed the Action API. Default keyframe interpolation is retained here
# instead of mutating legacy fcurve collections, keeping the animation compatible and deterministic.

# Save a .blend snapshot for provenance/rebuild, then render animation.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, "bm13_fenix_scene.blend"))
bpy.ops.render.render(animation=True)
print(f"BM13_BLEND_RENDER_COMPLETE:{out_dir}")
