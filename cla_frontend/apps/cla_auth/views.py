# from django.core.urlresolvers import reverse


# def login_redirect_url(request):
#     return reverse('call_centre:dashboard')
import json

from django.http import HttpResponseRedirect, Http404
from django.contrib.auth import REDIRECT_FIELD_NAME, login as auth_login
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.utils.http import is_safe_url
from django.shortcuts import resolve_url
from django.contrib.sites.models import get_current_site
from django.template.response import TemplateResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt

from proxy.views import proxy_view

from api.client import get_connection

from .forms import AuthenticationForm


@sensitive_post_parameters()
@csrf_protect
@never_cache
def login(request, template_name='accounts/login.html',
          redirect_field_name=REDIRECT_FIELD_NAME,
          authentication_form=AuthenticationForm,
          current_app=None, extra_context=None, zone_name=None):
    """
    Displays the login form and handles the login action.
    """
    is_json = 'application/json' in request.META.get('HTTP_ACCEPT', '')
    redirect_to = request.REQUEST.get(redirect_field_name, '')

    if request.method == "POST":
        form = authentication_form(
            request, data=request.POST, zone_name=zone_name
        )
        if form.is_valid():
            # Ensure the user-originating redirection url is safe.
            if not is_safe_url(url=redirect_to, host=request.get_host()):
                redirect_to = resolve_url(form.get_login_redirect_url())

            # Okay, security check complete. Log the user in.
            auth_login(request, form.get_user())

            if is_json:
                return HttpResponse(status=204)
            return HttpResponseRedirect(redirect_to)
        else:
            if is_json:
                return HttpResponse(
                    json.dumps(form.errors),
                    status=400,
                    content_type='application/json'
                )
    else:
        form = authentication_form(request, zone_name=zone_name)

    current_site = get_current_site(request)

    context = {
        'form': form,
        redirect_field_name: redirect_to,
        'site': current_site,
        'site_name': current_site.name,
    }
    if extra_context is not None:
        context.update(extra_context)

    if is_json:
        raise Http404()
    else:
        return TemplateResponse(request, template_name, context,
                               current_app=current_app)


@csrf_exempt
def backend_proxy_view(request, path):
    """
        TODO: hacky as it's getting the base_url and the auth header from the
            get_connection slumber object.

            Also, we should limit the endpoint accessible from this proxy
    """
    client = get_connection(request)


    extra_requests_args = {
        'headers': {k.upper(): v for k,v in dict([client._store['session'].auth.get_header()]).items()}
    }
    remoteurl = u"%s%s" % (client._store['base_url'], path)
    return proxy_view(request, remoteurl, extra_requests_args)
