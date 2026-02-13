import json

def update_capabilities(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Remove previous attempts if any (cleanup)
    data['capabilities'] = [c for c in data['capabilities'] if c['option_id'] not in ['fap_warranty_tier', 'fap_warranty_years', 'fap_standard', 'fap_gold', 'fap_platinum']]
    
    # Get unique model_id/model_label pairs
    models = {}
    for cap in data['capabilities']:
        if cap['model_id'] not in models:
            models[cap['model_id']] = cap['model_label']
            
    # New capabilities to add
    new_caps = []
    for model_id, model_label in models.items():
        # FAP Standard (Default True)
        new_caps.append({
            "model_id": model_id,
            "model_label": model_label,
            "option_id": "fap_standard",
            "raw": "yes, no",
            "allowed_values": [True, False]
        })
        # FAP Gold (Default False)
        new_caps.append({
            "model_id": model_id,
            "model_label": model_label,
            "option_id": "fap_gold",
            "raw": "no, yes",
            "allowed_values": [False, True]
        })
        # FAP Platinum (Default False)
        new_caps.append({
            "model_id": model_id,
            "model_label": model_label,
            "option_id": "fap_platinum",
            "raw": "no, yes",
            "allowed_values": [False, True]
        })
        # FAP Years
        new_caps.append({
            "model_id": model_id,
            "model_label": model_label,
            "option_id": "fap_warranty_years",
            "raw": "1, 2, 3, 4, 5",
            "allowed_values": [1, 2, 3, 4, 5]
        })
        
    data['capabilities'].extend(new_caps)
    
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=4)

update_capabilities('/home/mixy/configurator/src/logic/capabilities.json')
update_capabilities('/home/mixy/configurator/src/logic/blue_label_capabilities.json')
print("Capabilities updated successfully with separate boolean tiers.")
