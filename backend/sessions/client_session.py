import time

UPDATE_COOLDOWN = 2.5
PATH_CLEAR_INTERVAL = 6.0

PRIORITY = {
    "person": 10, "car": 9, "bicycle": 8, "motorcycle": 8,
    "dog": 7, "cat": 6, "chair": 5, "bench": 4, "bottle": 3, 
    "cell phone": 3, "remote": 3, "backpack": 3
}

def get_object_signature(label, position):
    return f"{label}_{position}"

class ClientSession:
    """
    Manages state for an individual connected client.
    Ensures that tracking, object counting, and audio announcements are isolated per session.
    """
    def __init__(self, sid):
        self.sid = sid
        self.tracked_objects = {}
        self.object_counter = 0
        self.last_path_clear_announcement = 0
        
    def generate_navigation_summary(self, preds, frame_shape):
        if not preds:
            return None
        
        width = frame_shape[1]
        left_count = sum(1 for p in preds if p["center"][0] < width * 0.35)
        right_count = sum(1 for p in preds if p["center"][0] > width * 0.65)
        ahead_count = len(preds) - left_count - right_count
        
        if ahead_count == 0:
            return "Path ahead is clear"
        elif left_count == 0 and right_count > 0:
            return "Path clear on your left"
        elif right_count == 0 and left_count > 0:
            return "Path clear on your right"
        elif ahead_count > 2:
            return f"{ahead_count} objects ahead, proceed carefully"
        return None

    def update_tracked_objects(self, current_preds, frame_shape):
        width = frame_shape[1]
        height = frame_shape[0]
        current_time = time.time()
        announcements = []
        active_signatures = set()
        
        for p in current_preds:
            label = p["label"]
            x_center = p["center"][0]
            bbox = p["bbox"]
            
            if x_center < width * 0.32:
                position = "right" # Inverted mapping
            elif x_center > width * 0.68:
                position = "left"  # Inverted mapping
            else:
                position = "ahead"
            
            obj_height = bbox[3] - bbox[1]
            distance_ratio = obj_height / height
            
            if distance_ratio > 0.50:
                distance = "very close"
            elif distance_ratio > 0.28:
                distance = "near"
            elif distance_ratio > 0.12:
                distance = "moderate distance"
            else:
                distance = "far"
            
            signature = get_object_signature(label, position)
            active_signatures.add(signature)
            
            if signature in self.tracked_objects:
                self.tracked_objects[signature]["last_seen"] = current_time
            
            if signature not in self.tracked_objects:
                self.object_counter += 1
                self.tracked_objects[signature] = {
                    "id": self.object_counter,
                    "label": label,
                    "position": position,
                    "distance": distance,
                    "first_seen": current_time,
                    "last_seen": current_time,
                    "last_announced": 0,
                    "times_announced": 0,
                    "prev_distance": distance
                }
                
                priority = label in ["person", "car", "bicycle", "motorcycle"]
                
                if position == "ahead":
                    text = f"{label} {distance} ahead"
                else:
                    text = f"{label} on your {position}, {distance}"
                
                if distance == "very close" and position == "ahead":
                    text = f"Watch out! {text}. Stop."
                    priority = True
                
                announcements.append((text, priority, label))
                self.tracked_objects[signature]["last_announced"] = current_time
                self.tracked_objects[signature]["times_announced"] += 1
                
            else:
                obj = self.tracked_objects[signature]
                time_since_announce = current_time - obj["last_announced"]
                
                if obj["prev_distance"] != distance and time_since_announce > UPDATE_COOLDOWN:
                    if position == "ahead":
                        text = f"{label} now {distance}"
                    else:
                        text = f"{label} on your {position}, now {distance}"
                    
                    if distance == "very close" and obj["prev_distance"] != "very close":
                        if position == "left":
                            text += ". Move right"
                        elif position == "right":
                            text += ". Move left"
                        else:
                            text += ". Stop"
                        priority = True
                    else:
                        priority = False
                    
                    announcements.append((text, priority, label))
                    obj["last_announced"] = current_time
                    obj["prev_distance"] = distance
        
        to_remove = []
        for sig, obj in list(self.tracked_objects.items()):
            if sig not in active_signatures:
                if current_time - obj["last_seen"] > 2.0:
                    if obj["distance"] in ["very close", "near"] and obj["times_announced"] > 0:
                        announcements.append((f"{obj['label']} moved away", False, obj['label']))
                    to_remove.append(sig)
        
        for sig in to_remove:
            del self.tracked_objects[sig]
        
        return announcements
