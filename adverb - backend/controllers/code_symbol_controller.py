from flask import json
from flask.wrappers import Request
from transformers import RobertaTokenizer, T5ForConditionalGeneration

class CodeSymbolController:
    def get_symbol_name(self, request: Request):
        if not request.data:
            return None

        data = json.loads(request.data)
        text = data.get("content", "")
        if not text:
            return None
            
        tokenizer = RobertaTokenizer.from_pretrained("Salesforce/codet5-base")
        model = T5ForConditionalGeneration.from_pretrained("Salesforce/codet5-base")

        input_ids = tokenizer(text, return_tensors="pt").input_ids
        generated_ids = model.generate(input_ids, max_length=10)

        result = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        return {"result": result}