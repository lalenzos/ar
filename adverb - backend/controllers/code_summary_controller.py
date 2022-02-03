from flask import json
from flask.wrappers import Request
from transformers import RobertaTokenizer, T5ForConditionalGeneration
# from fastT5 import export_and_get_onnx_model, get_onnx_model
# import time

class CodeSummaryController:
    def get_summary(self, request: Request):
        if not request.data:
            return None

        data = json.loads(request.data)
        text = data.get("content", "")
        if not text:
            return None
        
        model_name = "Salesforce/codet5-base-multi-sum"

        tokenizer = RobertaTokenizer.from_pretrained(model_name)

        # start = time.time()
        model = T5ForConditionalGeneration.from_pretrained(model_name)
        input_ids = tokenizer(text, return_tensors="pt").input_ids
        generated_ids = model.generate(input_ids, max_length=20)
        result = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        # latency = time.time() - start
        # print("Inference time = {} ms".format(latency * 1000, '.2f'))
        # print(result)

        # start = time.time()
        # output_path = "models/"
        # try:
        #     model = get_onnx_model(model_name, onnx_models_path=output_path)
        # except:
        #     model = export_and_get_onnx_model(model_name, custom_output_path=output_path)
        # token = tokenizer(text, return_tensors='pt')
        # tokens = model.generate(input_ids=token['input_ids'], attention_mask=token['attention_mask'], num_beams=2)
        # output = tokenizer.decode(tokens.squeeze(), skip_special_tokens=True)
        # latency = time.time() - start
        # print("Inference time = {} ms".format(latency * 1000, '.2f'))
        # print(output)

        return {"result": result}
