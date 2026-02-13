import json

def add_fap_rules(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    # Remove existing fap rules if any (safeguard)
    data['rules'] = [r for r in data['rules'] if not r['rule_id'].startswith('fap_')]
    
    fap_rules = [
        {
          "rule_id": "fap_gold_excludes_standard",
          "when": { "option_id": "fap_gold", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_standard", "value": True },
          "reason": "Only one FAP tier allowed."
        },
        {
          "rule_id": "fap_gold_excludes_platinum",
          "when": { "option_id": "fap_gold", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_platinum", "value": True },
          "reason": "Only one FAP tier allowed."
        },
        {
          "rule_id": "fap_platinum_excludes_standard",
          "when": { "option_id": "fap_platinum", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_standard", "value": True },
          "reason": "Only one FAP tier allowed."
        },
        {
          "rule_id": "fap_platinum_excludes_gold",
          "when": { "option_id": "fap_platinum", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_gold", "value": True },
          "reason": "Only one FAP tier allowed."
        },
        {
          "rule_id": "fap_standard_excludes_gold",
          "when": { "option_id": "fap_standard", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_gold", "value": True },
          "reason": "Only one FAP tier allowed."
        },
        {
          "rule_id": "fap_standard_excludes_platinum",
          "when": { "option_id": "fap_standard", "value": True },
          "effect": { "type": "exclude", "option_id": "fap_platinum", "value": True },
          "reason": "Only one FAP tier allowed."
        }
    ]
    
    data['rules'].extend(fap_rules)
    
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

add_fap_rules('/home/mixy/configurator/src/logic/rules.json')
print("Rules updated successfully.")
