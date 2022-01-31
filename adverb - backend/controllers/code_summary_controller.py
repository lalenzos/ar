from flask import json
from flask.wrappers import Request
from transformers import RobertaTokenizer, T5ForConditionalGeneration

class CodeSummaryController:
    
    def get_summary(self, request: Request):
        if not request.data:
            return None

        data = json.loads(request.data)
        text = data.get("content", "")
        if not text:
            return None
            
        tokenizer = RobertaTokenizer.from_pretrained("Salesforce/codet5-base-multi-sum")
        model = T5ForConditionalGeneration.from_pretrained("Salesforce/codet5-base-multi-sum")

        input_ids = tokenizer(text, return_tensors="pt").input_ids
        generated_ids = model.generate(input_ids, max_length=20)

        result = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        return {"result": result}